// ── Mobile nav toggle ─────────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen.toString());
    navToggle.textContent = isOpen ? '[close]' : '[menu]';
  });

  // Close nav when a link is clicked (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.textContent = '[menu]';
    });
  });
}

// ── Active nav link highlighting ─────────────────────────────
const sections = document.querySelectorAll('section[id]');
const allNavLinks = document.querySelectorAll('.nav-links a');

function updateActiveLink() {
  let current = '';
  sections.forEach(section => {
    const top = section.getBoundingClientRect().top;
    if (top <= 80) current = section.getAttribute('id');
  });
  allNavLinks.forEach(link => {
    link.style.fontWeight = link.getAttribute('href') === `#${current}` ? '700' : '500';
  });
}

window.addEventListener('scroll', updateActiveLink, { passive: true });
updateActiveLink();
