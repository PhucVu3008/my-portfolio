// ── Dark Mode ─────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const savedTheme  = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggle) themeToggle.textContent = savedTheme === 'dark' ? '[light]' : '[dark]';
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.textContent = next === 'dark' ? '[light]' : '[dark]';
  });
}

// ── Back to Top ───────────────────────────────────────────────
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Nav: scroll class + mobile toggle + active links ──────────
const nav       = document.querySelector('.nav');
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.textContent = isOpen ? '[close]' : '[menu]';
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.textContent = '[menu]';
    });
  });
}

const sections    = document.querySelectorAll('section[id]');
const allNavLinks = document.querySelectorAll('.nav-links a');
function updateActiveLink() {
  let current = '';
  // If at bottom of page, force last section active
  const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 8;
  if (atBottom && sections.length) {
    current = sections[sections.length - 1].id;
  } else {
    sections.forEach(s => {
      if (s.getBoundingClientRect().top <= 80) current = s.id;
    });
  }
  allNavLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
}
window.addEventListener('scroll', updateActiveLink, { passive: true });
updateActiveLink();


// ── Typewriter reveal ─────────────────────────────────────────
// Strategy: pre-render full HTML (so layout is locked), then wrap
// every non-space char in .tw-ch span and reveal via rAF — zero jitter.
function typewriterReveal(el) {
  // 1. Make element visible but hidden so we can measure it
  el.style.cssText += ';opacity:1!important;transform:none!important;transition:none!important;visibility:hidden';
  el.classList.add('tw-active');

  // 2. Lock height so layout never shifts during reveal
  const h = el.offsetHeight;
  if (h > 0) el.style.minHeight = h + 'px';

  // 3. Walk DOM and wrap every non-whitespace char in a .tw-ch span
  function wrapNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Skip pure-whitespace nodes — they are structural (grid/flex gaps)
      // and must NOT become extra grid/flex items
      if (!node.textContent.trim()) return;
      const parent = node.parentNode;
      // Outer wrapper = one flex/grid item; chars live inside it → no gap between chars
      const outer = document.createElement('span');
      outer.style.cssText = 'display:inline;padding:0;margin:0;font:inherit;';
      [...node.textContent].forEach(ch => {
        if (/\s/.test(ch)) {
          outer.appendChild(document.createTextNode(ch));
        } else {
          const s = document.createElement('span');
          s.className = 'tw-ch';
          s.textContent = ch;
          outer.appendChild(s);
        }
      });
      parent.replaceChild(outer, node);
    } else if (node.nodeType === Node.ELEMENT_NODE &&
               node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
      [...node.childNodes].forEach(wrapNode);
    }
  }
  wrapNode(el);

  // 4. Now show element — chars invisible via .tw-ch { opacity:0 }
  el.style.visibility = 'visible';

  const spans = Array.from(el.querySelectorAll('.tw-ch'));
  if (!spans.length) return;

  // 5. Reveal all chars over ~450ms using rAF
  const DURATION = 450;
  const start = performance.now();
  let revealed = 0;

  function frame(now) {
    const progress = Math.min(1, (now - start) / DURATION);
    // Ease-out: reveal faster at start, slow at end
    const eased = 1 - Math.pow(1 - progress, 2);
    const target = Math.floor(eased * spans.length);
    while (revealed < target) {
      spans[revealed].classList.add('on');
      revealed++;
    }
    if (revealed < spans.length) {
      requestAnimationFrame(frame);
    } else {
      el.style.minHeight = '';
    }
  }
  requestAnimationFrame(frame);
}

// ── Reveal on scroll — all elements start simultaneously ──────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      revealObserver.unobserve(el);
      typewriterReveal(el);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


// ── ASCII Art: per-character interactive animation ────────────
function initAsciiArt() {
  const pre = document.querySelector('.hero-ascii-art');
  if (!pre) return;

  // Split text into per-char spans preserving whitespace
  const rawText = pre.textContent;
  pre.textContent = '';

  const lines = rawText.split('\n');
  lines.forEach(line => {
    const lineDiv = document.createElement('div');
    lineDiv.style.cssText = 'white-space:pre; line-height:inherit;';
    [...line].forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      // Only animate non-space chars
      if (ch.trim() !== '') {
        span.className = 'ascii-char';
      }
      lineDiv.appendChild(span);
    });
    pre.appendChild(lineDiv);
  });

  const chars = Array.from(pre.querySelectorAll('.ascii-char'));
  if (!chars.length) return;

  let isMouseOver = false;
  let idleTimer   = null;
  let idleTimeouts = [];

  // ── Mouse interaction ──────────────────────────────────────
  const MAX_DIST   = 90;   // px radius of influence
  const MAX_SCALE  = 2.2;  // char under cursor
  const MIN_SCALE  = 0.75; // chars far away

  function applyMouseEffect(mx, my) {
    chars.forEach(span => {
      const r  = span.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const d  = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      const t  = Math.max(0, 1 - d / MAX_DIST);          // 0→1, 1 = closest
      const scale   = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t;
      const opacity = 0.25 + 0.75 * t;
      const glow    = t > 0.15
        ? `0 0 ${t * 18}px rgba(253,252,252,${(t * 0.9).toFixed(2)})`
        : 'none';

      span.style.transform   = `scale(${scale.toFixed(3)})`;
      span.style.opacity     = opacity.toFixed(3);
      span.style.textShadow  = glow;
      span.style.color       = t > 0.4
        ? '#ffffff'
        : `rgba(253,252,252,${(0.5 + t * 0.5).toFixed(2)})`;
    });
  }

  function resetChars() {
    chars.forEach(span => {
      span.style.transform  = '';
      span.style.opacity    = '';
      span.style.textShadow = '';
      span.style.color      = '';
    });
  }

  pre.addEventListener('mousemove', e => {
    isMouseOver = true;
    stopIdle();
    applyMouseEffect(e.clientX, e.clientY);
  });

  pre.addEventListener('mouseleave', () => {
    isMouseOver = false;
    resetChars();
    startIdle();
  });

  // ── Idle random pulse ──────────────────────────────────────
  function pulseChar(span) {
    const scale = 1.25 + Math.random() * 0.95;   // 1.25 → 2.2
    span.style.transform  = `scale(${scale.toFixed(2)})`;
    span.style.textShadow = `0 0 12px rgba(253,252,252,0.65)`;
    span.style.color      = '#ffffff';

    const tid = setTimeout(() => {
      if (!isMouseOver) {
        span.style.transform  = '';
        span.style.textShadow = '';
        span.style.color      = '';
      }
    }, 350 + Math.random() * 350);
    idleTimeouts.push(tid);
  }

  function idleTick() {
    if (isMouseOver) return;
    // Pulse 2-4 random chars per tick
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const delay = i * 90;
      const tid = setTimeout(() => {
        if (!isMouseOver) {
          pulseChar(chars[Math.floor(Math.random() * chars.length)]);
        }
      }, delay);
      idleTimeouts.push(tid);
    }
  }

  function startIdle() {
    stopIdle();
    idleTick(); // fire immediately
    idleTimer = setInterval(idleTick, 380);
  }

  function stopIdle() {
    clearInterval(idleTimer);
    idleTimeouts.forEach(clearTimeout);
    idleTimeouts = [];
  }

  // Start idle after hero entrance animation settles
  setTimeout(startIdle, 1200);
}

initAsciiArt();


// ── Typed terminal command ─────────────────────────────────────
const commands = [
  'npm run dev  # fastify backend on :3001',
  'git commit -m "feat: add pgvector semantic search"',
  'docker compose up -d --build',
  'python train.py --model arcface --epochs 30',
  'gh workflow run deploy.yml --ref main',
  'psql -c "CREATE INDEX ON embeddings USING ivfflat (vec vector_cosine_ops)"',
];
let cmdIndex   = 0;
let charIndex  = 0;
let isDeleting = false;
let typePaused = false;
const cmdEl    = document.getElementById('typed-cmd');

function type() {
  if (!cmdEl) return;
  const current = commands[cmdIndex];
  if (!isDeleting) {
    cmdEl.textContent = current.slice(0, ++charIndex);
    if (charIndex === current.length) {
      typePaused = true;
      setTimeout(() => { typePaused = false; isDeleting = true; scheduleType(); }, 2200);
      return;
    }
  } else {
    cmdEl.textContent = current.slice(0, --charIndex);
    if (charIndex === 0) {
      isDeleting = false;
      cmdIndex   = (cmdIndex + 1) % commands.length;
    }
  }
  scheduleType();
}
function scheduleType() {
  if (!typePaused) setTimeout(type, isDeleting ? 28 : 62);
}
setTimeout(type, 1800);
