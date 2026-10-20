#!/usr/bin/env node
// Generates VuMinhPhuc-Resume.pdf from resume.html + data.json
// Usage: node scripts/generate-resume.mjs [--check]
// Caller: .github/workflows/deploy.yml (Generate resume PDF step), package.json script "resume:build"
// No existing file does this — no scripts/ dir existed before this task.
// Reads: data.json { person:{name,alias,headline,location,email,github,linkedin,aptisUrl}, resume:{portfolioUrl,summary,skillLines,experience,selectedProjects}, education, certifications } — date strings like "Jan 2026 — Present", "2024".
// Writes: VuMinhPhuc-Resume.pdf (A4, printBackground:true)
// Instruction verbatim: "làm đi"
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resumeHtml = resolve(root, 'resume.html');
const dataJson = resolve(root, 'data.json');
const outPdf = resolve(root, 'VuMinhPhuc-Resume.pdf');

if (!existsSync(dataJson)) { console.error('data.json not found'); process.exit(1); }
if (!existsSync(resumeHtml)) { console.error('resume.html not found'); process.exit(1); }

const data = JSON.parse(readFileSync(dataJson, 'utf8'));
for (const k of ['person','resume','education','certifications']) if (!data[k]) { console.error(`data.json missing key: ${k}`); process.exit(1); }
if (process.argv.includes('--check')) { console.log('data.json OK —', Object.keys(data).join(', ')); process.exit(0); }

let puppeteer;
try { puppeteer = await import('puppeteer'); } catch { console.error('puppeteer not installed. Run: npm i -D puppeteer'); process.exit(1); }
puppeteer = puppeteer.default ?? puppeteer;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  const html = readFileSync(resumeHtml, 'utf8');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate((injectedData) => {
    const d = injectedData;
    const byId = (id) => document.getElementById(id);
    if (byId('r-name') && !byId('r-name').textContent) {
      const r = d.resume, p = d.person;
      byId('r-name').textContent = p.name + ' — ' + p.alias;
      byId('r-headline').textContent = p.headline + ' · ' + p.location;
      byId('r-contacts').innerHTML = [
        `<a href="mailto:${p.email}">${p.email}</a>`,
        `<a href="${r.portfolioUrl}">portfolio</a>`,
        `<a href="${p.github}">github</a>`,
        `<a href="${p.linkedin}">linkedin</a>`,
        p.aptisUrl ? `<a href="${p.aptisUrl}">English B2 (APTIS)</a>` : '',
      ].filter(Boolean).join(' · ');
      byId('r-summary').textContent = r.summary;
      byId('r-skills').innerHTML = r.skillLines.map(l => {
        const i = l.indexOf(':');
        return `<div class="skill-line"><strong>${l.slice(0, i)}</strong>${l.slice(i)}</div>`;
      }).join('');
      byId('r-exp').innerHTML = r.experience.map(e=>`<div class="exp-item"><div class="exp-head"><div><span class="exp-role">${e.role}</span> <span class="exp-company">— ${e.company}</span></div><div class="exp-period">${e.period}</div></div><ul class="exp-bullets">${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('');
      byId('r-projects').innerHTML = r.selectedProjects.map(p=>`<div class="proj-item"><span class="proj-name">${p.name}</span> <span class="proj-meta">· ${p.meta}</span><div class="proj-desc">${p.desc}</div><div class="proj-tags">${p.tags.join(' · ')}</div></div>`).join('');
      const edu = d.education[0], certs = d.certifications.map(c=>`${c.name} — ${c.issuer}`).join('; ');
      byId('r-edu').innerHTML = `<div class="edu-line"><strong>${edu.degree}</strong>, ${edu.school} (${edu.period})</div><div class="edu-line" style="color:var(--mute)">Certifications: ${certs}</div>`;
      document.documentElement.dataset.resumeReady='true';
    }
  }, data);
  await page.evaluateHandle('document.fonts.ready');
  await page.waitForFunction(() => document.documentElement.dataset.resumeReady === 'true', { timeout: 10000 });
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true, margin: { top:'0', right:'0', bottom:'0', left:'0' } });
  console.log('PDF written to', outPdf);
} finally { await browser.close(); }
