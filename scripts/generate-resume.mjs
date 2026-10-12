#!/usr/bin/env node
// Generates VuMinhPhuc_TDTU_Resume.pdf from resume.html + data.json
// Usage: node scripts/generate-resume.mjs [--check]
// Caller: .github/workflows/deploy.yml (Generate resume PDF step), package.json script "resume:build"
// No existing file does this — no scripts/ dir existed before this task.
// Reads: data.json { person:{name,alias,headline,location,email,github,linkedin,kaggle}, about, skills:[{group,items}], experience:[{period,company,role,bullets}], education, projects, certifications } — date strings like "Jan 2026 — Present", "2024".
// Writes: VuMinhPhuc_TDTU_Resume.pdf (A4, printBackground:true)
// Instruction verbatim: "làm đi"
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resumeHtml = resolve(root, 'resume.html');
const dataJson = resolve(root, 'data.json');
const outPdf = resolve(root, 'VuMinhPhuc_TDTU_Resume.pdf');

if (!existsSync(dataJson)) { console.error('data.json not found'); process.exit(1); }
if (!existsSync(resumeHtml)) { console.error('resume.html not found'); process.exit(1); }

const data = JSON.parse(readFileSync(dataJson, 'utf8'));
for (const k of ['person','about','skills','experience','projects']) if (!data[k]) { console.error(`data.json missing key: ${k}`); process.exit(1); }
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
      byId('r-name').textContent = d.person.name + ' — ' + d.person.alias;
      byId('r-headline').textContent = d.person.headline + ' · ' + d.person.location;
      byId('r-contacts').innerHTML = [
        `<a href="mailto:${d.person.email}">${d.person.email}</a>`,
        `<a href="${d.person.github}" target="_blank">${d.person.github.replace('https://','')}</a>`,
        `<a href="${d.person.linkedin}" target="_blank">${d.person.linkedin.replace('https://','')}</a>`,
        d.person.kaggle ? `<a href="${d.person.kaggle}" target="_blank">${d.person.kaggle.replace('https://','')}</a>` : '',
      ].filter(Boolean).join(' · ');
      byId('r-about').innerHTML = d.about;
      byId('r-skills').innerHTML = d.skills.map(g=>`<div><div class="skill-group-label">${g.group}</div><div class="skill-items">${g.items.join(' · ')}</div></div>`).join('');
      byId('r-exp').innerHTML = d.experience.map(e=>`<div class="exp-item"><div class="exp-head"><div><div class="exp-role">${e.role}</div><div class="exp-company">${e.company}</div></div><div class="exp-period">${e.period}</div></div><ul class="exp-bullets">${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div>`).join('');
      byId('r-projects').innerHTML = d.projects.map(p=>`<div class="proj-item"><div style="display:flex;justify-content:space-between;gap:12px"><span class="proj-name">${p.name}${p.contributor?' <span style="font-weight:400;color:var(--mute);font-size:9px">[contributor]</span>':''}</span><span class="proj-meta">${p.period} · ${p.category}</span></div><div class="proj-desc">${p.desc}</div><div class="proj-tags">${p.tags.map(t=>`<span class="proj-tag">${t}</span>`).join('')}</div></div>`).join('');
      byId('r-edu').innerHTML = d.education.map(e=>`<div class="edu-row"><div><div class="edu-degree">${e.degree}</div><div class="edu-school">${e.school}</div><div class="edu-note">${e.note||''}</div></div><div class="exp-period">${e.period}</div></div>`).join('');
      byId('r-certs').innerHTML = d.certifications.map(c=>`<div class="cert-item"><div><span class="cert-name">${c.name}</span> <span class="cert-issuer">— ${c.issuer}</span></div><span class="exp-period">${c.year}</span></div>`).join('');
      document.documentElement.dataset.resumeReady='true';
    }
  }, data);
  await page.evaluateHandle('document.fonts.ready');
  await page.waitForFunction(() => document.documentElement.dataset.resumeReady === 'true', { timeout: 10000 });
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true, margin: { top:'0', right:'0', bottom:'0', left:'0' } });
  console.log('PDF written to', outPdf);
} finally { await browser.close(); }
