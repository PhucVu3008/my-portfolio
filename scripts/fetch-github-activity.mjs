#!/usr/bin/env node
// ── GitHub activity fetcher ───────────────────────────────────
// Pulls public activity for USERNAME via the GitHub GraphQL + REST
// APIs and writes a compact JSON snapshot the portfolio reads at
// runtime. Runs in CI (see .github/workflows/deploy.yml) with the
// built-in GITHUB_TOKEN, and can be run locally with a PAT:
//   GITHUB_TOKEN=ghp_xxx node scripts/fetch-github-activity.mjs
//
// Fails soft: on any error it keeps the existing data file (if any)
// so a transient API hiccup never ships an empty portfolio.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USERNAME = process.env.GH_USERNAME || 'PhucVu3008';
const TOKEN    = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'github-activity.json');

const MAX_RECENT_REPOS = 6;
const MAX_FEED_ITEMS   = 8;
const MAX_LANGUAGES     = 6;

if (!TOKEN) {
  console.error('✗ No GITHUB_TOKEN / GH_TOKEN in environment — cannot fetch.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'User-Agent': `${USERNAME}-portfolio-activity`,
  Accept: 'application/vnd.github+json',
};

// ── GraphQL: stats, repos, languages, contribution calendar ───
const GQL = `
query($login: String!) {
  user(login: $login) {
    name
    login
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        description
        url
        pushedAt
        stargazerCount
        isFork
        isArchived
        primaryLanguage { name color }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function graphql() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GQL, variables: { login: USERNAME } }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data.user;
}

// ── REST: public event feed ───────────────────────────────────
async function fetchEvents() {
  const res = await fetch(`https://api.github.com/users/${USERNAME}/events/public?per_page=30`, { headers });
  if (!res.ok) throw new Error(`Events ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Compute current contribution streak (consecutive days) ────
function currentStreak(weeks) {
  const days = weeks.flatMap(w => w.contributionDays).sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) streak++;
    else if (i === days.length - 1) continue; // today may be empty; don't break the streak yet
    else break;
  }
  return streak;
}

// ── Flatten the contribution calendar into a compact day list ─
// Output: { total, max, days: [{ d: "YYYY-MM-DD", c: count }] } sorted
// oldest→newest. The client renders these as a GitHub-style heatmap.
function buildCalendar(cal) {
  const days = cal.weeks
    .flatMap(w => w.contributionDays)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(x => ({ d: x.date, c: x.contributionCount }));
  const max = days.reduce((m, x) => Math.max(m, x.c), 0);
  return { total: cal.totalContributions, max, days };
}

// ── Aggregate top languages by bytes across owned, non-fork repos ─
function topLanguages(repos) {
  const totals = new Map(); // name -> { size, color }
  for (const r of repos) {
    if (r.isFork) continue;
    for (const e of r.languages?.edges ?? []) {
      const cur = totals.get(e.node.name) || { size: 0, color: e.node.color };
      cur.size += e.size;
      totals.set(e.node.name, cur);
    }
  }
  const grand = [...totals.values()].reduce((s, l) => s + l.size, 0) || 1;
  return [...totals.entries()]
    .map(([name, { size, color }]) => ({ name, color: color || '#888', pct: +(size / grand * 100).toFixed(1) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, MAX_LANGUAGES);
}

// ── Map a raw REST event into a compact feed item ─────────────
function mapEvent(ev) {
  const repo = ev.repo?.name;
  const when = ev.created_at;
  switch (ev.type) {
    case 'PushEvent': {
      const n = ev.payload?.commits?.length || ev.payload?.size || 0;
      return { type: 'push', text: `Pushed ${n} commit${n === 1 ? '' : 's'} to`, repo, when };
    }
    case 'CreateEvent':
      return { type: 'create', text: `Created ${ev.payload?.ref_type || 'repository'} in`, repo, when };
    case 'PullRequestEvent':
      return { type: 'pr', text: `${cap(ev.payload?.action)} pull request in`, repo, when };
    case 'IssuesEvent':
      return { type: 'issue', text: `${cap(ev.payload?.action)} issue in`, repo, when };
    case 'IssueCommentEvent':
      return { type: 'comment', text: `Commented on`, repo, when };
    case 'ForkEvent':
      return { type: 'fork', text: `Forked`, repo, when };
    case 'WatchEvent':
      return { type: 'star', text: `Starred`, repo, when };
    case 'ReleaseEvent':
      return { type: 'release', text: `Released ${ev.payload?.release?.tag_name || ''} in`, repo, when };
    default:
      return null;
  }
}
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

async function main() {
  const [user, events] = await Promise.all([graphql(), fetchEvents()]);

  const repos = user.repositories.nodes;
  const owned = repos.filter(r => !r.isFork);

  const totalStars = owned.reduce((s, r) => s + r.stargazerCount, 0);
  const cc = user.contributionsCollection;

  const recentRepos = owned
    .filter(r => !r.isArchived)
    .slice(0, MAX_RECENT_REPOS)
    .map(r => ({
      name: r.name,
      description: r.description || '',
      url: r.url,
      pushedAt: r.pushedAt,
      stars: r.stargazerCount,
      language: r.primaryLanguage?.name || null,
      languageColor: r.primaryLanguage?.color || null,
    }));

  const feed = events
    .map(mapEvent)
    .filter(item => item && item.repo)
    .slice(0, MAX_FEED_ITEMS);

  const data = {
    generatedAt: new Date().toISOString(),
    username: user.login,
    profileUrl: `https://github.com/${user.login}`,
    stats: {
      publicRepos: user.repositories.totalCount,
      totalStars,
      followers: user.followers.totalCount,
      contributionsLastYear: cc.contributionCalendar.totalContributions,
      commitsLastYear: cc.totalCommitContributions,
      pullRequestsLastYear: cc.totalPullRequestContributions,
      currentStreak: currentStreak(cc.contributionCalendar.weeks),
    },
    calendar: buildCalendar(cc.contributionCalendar),
    languages: topLanguages(owned),
    recentRepos,
    feed,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ Wrote ${OUT_PATH}`);
  console.log(`  ${data.stats.publicRepos} repos · ${data.stats.totalStars}★ · ` +
              `${data.stats.contributionsLastYear} contributions · ${feed.length} events · ` +
              `${data.languages.length} languages`);
}

main().catch(async (err) => {
  console.error('✗ Fetch failed:', err.message);
  // Keep any existing snapshot rather than shipping nothing.
  try {
    await readFile(OUT_PATH);
    console.error('  Keeping existing data/github-activity.json.');
    process.exit(0);
  } catch {
    console.error('  No existing snapshot to fall back to.');
    process.exit(1);
  }
});
