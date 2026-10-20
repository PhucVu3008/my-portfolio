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
| **Education** | Degree, school, coursework |
| **Projects** | Selected projects with tech tags (rendered from `data.json`) |
| **Activity** | GitHub contribution heatmap, stats, recent repos (auto-updated weekly) |
| **Certifications** | Language + ML certificates |
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

### Updating content (web + CV in one edit)

Edit `data.json` — both the website and the resume PDF read from it.

```bash
npm install          # once, for PDF generation
npm run resume:build # regenerates VuMinhPhuc-Resume.pdf from resume.html + data.json
```

On every push to `main`, GitHub Actions regenerates the PDF automatically before deploying to GitHub Pages. The **cv →** button always serves the latest content without touching the layout.

---

## 📁 Project Structure

```
my-portfolio/
├── data.json            # Single source of truth — edit here, web + PDF both update
├── resume.html          # Resume template (styled for PDF, renders data.json → resume block)
├── scripts/generate-resume.mjs   # Builds VuMinhPhuc-Resume.pdf via Puppeteer
├── scripts/fetch-github-activity.mjs  # Weekly GitHub stats → data/github-activity.json
├── index.html           # Single-page portfolio (projects rendered from data.json)
├── 404.html             # Custom not-found page for GitHub Pages
├── og-image.png         # Social share preview (from og-image.svg source)
├── style.css            # All styles (CSS custom properties)
├── script.js            # Animations, typewriter, nav scroll-spy, projects/activity render
├── DESIGN.md            # Design reference (opencode.ai aesthetic)
├── VuMinhPhuc-Resume.pdf  # Generated on CI — do not edit by hand
└── .github/
    └── workflows/
        └── deploy.yml   # GitHub Pages auto-deploy on push to main + weekly rebuild
```

---

## 📄 License

MIT — feel free to use this as a template for your own portfolio.