#!/usr/bin/env node
/**
 * Automatic UI version number. Runs in CI after every successful push to main
 * (see .github/workflows/release-notes.yml); nobody has to remember it.
 *
 *   node scripts/release.mjs            bump the version and write the files
 *   node scripts/release.mjs --dry-run  print the next version, change nothing
 *
 * Version bump:  breaking change (type! or BREAKING CHANGE)  -> major
 *                any feat                                    -> minor
 *                anything else                               -> patch (a push always gets a number)
 *
 * release.json holds the last released version and the commit it was computed at; the next version
 * is always computed from that pair, so re-running gives the same number. The version is written to
 * package.json (+ lock) and src/environments/*.ts (appVersion).
 *
 * The backend has its own version number (its pipeline does the same for API.csproj). What users
 * read in "What's new" and on the blog is NOT generated here: it is written as a Flyway migration in
 * the API repo (db/migrations/V*__release_notes_*.sql) and served from the database.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = resolve(ROOT, 'release.json');
const BOT_AUTHORS = new Set(['github-actions[bot]']);

// ── Pure helpers (unit-tested in release.test.mjs) ────────────────────────────────

export function parseCommit({ subject, body = '' }) {
  const m = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(subject.trim());
  return {
    type: m ? m[1].toLowerCase() : 'other',
    breaking: Boolean(m?.[3]) || /^BREAKING[ -]CHANGE:/m.test(body),
  };
}

export function bumpVersion(current, commits) {
  const [major, minor, patch] = current.split('.').map(Number);
  const parsed = commits.map(parseCommit);
  if (parsed.some((c) => c.breaking)) return `${major + 1}.0.0`;
  if (parsed.some((c) => c.type === 'feat')) return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// ── git + files ──────────────────────────────────────────────────────────────────

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

function commitsSince(sha) {
  let range = `${sha}..HEAD`;
  try {
    git('merge-base', '--is-ancestor', sha, 'HEAD');
  } catch {
    range = '-n50'; // history was rewritten: fall back to the latest commits
  }
  const raw = git('log', '--reverse', '--no-merges', '--format=%H%x1f%an%x1f%s%x1f%b%x1e', range);
  return raw
    .split('\x1e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [sha, author, subject, body] = r.split('\x1f');
      return { sha, author, subject, body: body ?? '' };
    })
    .filter((c) => !BOT_AUTHORS.has(c.author) && !/^chore\(release\)/i.test(c.subject));
}

function writeJson(path, mutate) {
  if (!existsSync(path)) return;
  const json = JSON.parse(readFileSync(path, 'utf8'));
  mutate(json);
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
}

function syncVersion(version) {
  writeJson(resolve(ROOT, 'package.json'), (p) => (p.version = version));
  writeJson(resolve(ROOT, 'package-lock.json'), (l) => {
    l.version = version;
    if (l.packages?.['']) l.packages[''].version = version;
  });
  for (const env of ['environment.ts', 'environment.prod.ts']) {
    const path = resolve(ROOT, 'src/environments', env);
    if (!existsSync(path)) continue;
    const before = readFileSync(path, 'utf8');
    const after = before.replace(/appVersion:\s*'[^']*'/, `appVersion: '${version}'`);
    if (after !== before) writeFileSync(path, after);
  }
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const state = JSON.parse(readFileSync(STATE, 'utf8'));
  const commits = commitsSince(state.commit);

  if (commits.length === 0) {
    console.log(`No new commits since v${state.version} (${state.commit.slice(0, 7)}). Nothing to release.`);
    return;
  }

  const next = bumpVersion(state.version, commits);
  console.log(`App v${state.version} -> v${next} (${commits.length} commit(s))`);
  for (const c of commits) console.log(`  ${c.sha.slice(0, 7)} ${c.subject}`);
  console.log(`Release notes (what users read): add db/migrations/V<n>__release_notes_app_${next.replaceAll('.', '_')}.sql in the API repo.`);

  if (dryRun) return;

  syncVersion(next);
  writeFileSync(STATE, JSON.stringify({ version: next, commit: git('rev-parse', 'HEAD') }, null, 2) + '\n');
  console.log(`Wrote v${next}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
