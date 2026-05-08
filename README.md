# Vu Minh Phuc — Personal Portfolio

> Live at **[phucvu3008.github.io/my-portfolio](https://phucvu3008.github.io/my-portfolio/)**

A single-page personal portfolio built with pure HTML, CSS, and vanilla JavaScript. No frameworks, no bundlers — just clean, fast static files deployed via GitHub Pages.

---

## ✨ Features

- **Fullscreen TUI-style hero** — macOS terminal chrome with CRT scanlines overlay
- **Interactive ASCII wordmark** — per-character spring-physics lens distortion on mouse hover, random idle pulse
- **Typewriter reveal animations** — sections animate in character-by-character as you scroll
- **Responsive layout** — mobile-friendly with adaptive typography
- **Smooth nav** — active-link tracking with scroll-spy (including bottom-of-page contact fix)

---

## 🗂️ Sections

| Section | Content |
|---|---|
| **Hero** | ASCII art name, animated subtitle, quick-links |
| **About** | Short bio, location, contact links |
| **Skills** | Languages, frameworks, databases, tools |
| **Experience** | Work history (most recent first) |
| **Projects** | Selected GitHub projects with tech tags |
| **Contact** | Email, GitHub, LinkedIn |

---

## 🛠️ Tech Stack

| Area | Choice |
|---|---|
| Markup | HTML5 (semantic) |
| Styling | CSS3 custom properties, CSS Grid / Flexbox |
| Scripting | Vanilla JavaScript (ES2022) |
| Font | JetBrains Mono (Google Fonts) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions (`deploy.yml`) |

Design language follows the **opencode.ai** aesthetic — warm cream `#fdfcfc` background, near-black `#201d1d` text, minimal colour accents.

---

## 🚀 Local Development

No build step required — just open the file:

```bash
# clone
git clone https://github.com/PhucVu3008/my-portfolio.git
cd my-portfolio

# serve locally (any static server works)
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## 📁 Project Structure

```
my-portfolio/
├── index.html          # Single-page portfolio
├── style.css           # All styles (CSS custom properties)
├── script.js           # Animations, typewriter, nav scroll-spy
├── DESIGN.md           # Design reference (opencode.ai aesthetic)
├── VuMinhPhuc_TDTU_Resume.pdf
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages auto-deploy on push to main
```

---

## 📄 License

MIT — feel free to use this as a template for your own portfolio.