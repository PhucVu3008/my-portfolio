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
  sections.forEach(s => {
    if (s.getBoundingClientRect().top <= 80) current = s.id;
  });
  allNavLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
}
window.addEventListener('scroll', updateActiveLink, { passive: true });
updateActiveLink();


// ── Typewriter reveal ─────────────────────────────────────────
function typewriterReveal(el) {
  const tmp = document.createElement('div');
  tmp.innerHTML = el.innerHTML;

  const tokens = [];
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      [...node.textContent].forEach(c => tokens.push({ type: 'char', val: c }));
    } else if (node.nodeName === 'BR') {
      tokens.push({ type: 'br' });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      tokens.push({ type: 'open', tag: node.nodeName, cls: node.className, href: node.getAttribute('href'), target: node.getAttribute('target') });
      node.childNodes.forEach(walk);
      tokens.push({ type: 'close' });
    }
  }
  tmp.childNodes.forEach(walk);

  el.innerHTML = '';
  el.classList.add('tw-active');

  const cursor = document.createElement('span');
  cursor.className = 'tw-cursor';
  el.appendChild(cursor);
  let currentParent = el;
  const stack = [];

  // Fast: cap at 1.0s total regardless of length
  const charCount = Math.max(tokens.filter(t => t.type === 'char').length, 1);
  const speed = Math.min(40, Math.max(8, Math.floor(1000 / charCount)));

  let i = 0;
  function tick() {
    if (i >= tokens.length) {
      setTimeout(() => cursor.remove(), 500);
      return;
    }
    const t = tokens[i++];
    if (t.type === 'char') {
      currentParent.insertBefore(document.createTextNode(t.val), cursor);
    } else if (t.type === 'br') {
      currentParent.insertBefore(document.createElement('br'), cursor);
    } else if (t.type === 'open') {
      const wrap = document.createElement(t.tag);
      if (t.cls)    wrap.className = t.cls;
      if (t.href)   wrap.setAttribute('href', t.href);
      if (t.target) wrap.setAttribute('target', t.target);
      currentParent.insertBefore(wrap, cursor);
      wrap.appendChild(cursor);
      stack.push(currentParent);
      currentParent = wrap;
    } else if (t.type === 'close') {
      currentParent = stack.pop() || el;
      currentParent.appendChild(cursor);
    }
    if (t.type === 'char') setTimeout(tick, speed);
    else tick();
  }
  tick();
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
  'python train.py --model resnet50 --epochs 50',
  'git commit -m "feat: add object detection module"',
  'python preprocess.py --dataset COCO --split train',
  'pip install torch torchvision opencv-python',
  'python evaluate.py --checkpoint best_model.pth',
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
