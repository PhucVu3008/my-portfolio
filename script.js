// ── Nav: scroll + mobile toggle + active links ─────────────────
const nav       = document.querySelector('.nav');
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

// Scrolled class for nav frosted glass
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Mobile toggle
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

// Active nav link on scroll
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


// ── Reveal on scroll (IntersectionObserver) ───────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


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
let typePause  = false;

const cmdEl = document.getElementById('typed-cmd');

function type() {
  if (!cmdEl) return;
  const current = commands[cmdIndex];

  if (!isDeleting) {
    cmdEl.textContent = current.slice(0, charIndex + 1);
    charIndex++;
    if (charIndex === current.length) {
      typePause = true;
      setTimeout(() => { typePause = false; isDeleting = true; requestAnimationFrame(tick); }, 2200);
      return;
    }
  } else {
    cmdEl.textContent = current.slice(0, charIndex - 1);
    charIndex--;
    if (charIndex === 0) {
      isDeleting = false;
      cmdIndex = (cmdIndex + 1) % commands.length;
    }
  }

  const speed = isDeleting ? 30 : 65;
  setTimeout(() => requestAnimationFrame(tick), speed);
}

function tick() { if (!typePause) type(); }

// Start after hero animations settle
setTimeout(tick, 1600);


// ── Skills stagger on section enter ───────────────────────────
const skillsSection = document.getElementById('skills');
if (skillsSection) {
  const skillObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll('.skills-list li').forEach((li, i) => {
        li.style.transitionDelay = `${i * 40}ms`;
        li.classList.add('visible');
      });
      skillObserver.disconnect();
    }
  }, { threshold: 0.15 });
  skillObserver.observe(skillsSection);
}
