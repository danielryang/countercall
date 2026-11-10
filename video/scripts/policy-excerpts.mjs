// video/scripts/policy-excerpts.mjs: copies REAL source lines from the policy files into video/public/policy.json for the Policy scene.
// Excerpts are located by marker text, not hard-coded line numbers, and the script fails if a marker is gone, so the video can never show
// code the repo does not contain. Run from video/: `node scripts/policy-excerpts.mjs` (also part of `npm run data`).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const out = path.resolve(process.cwd(), 'public/policy.json');

/** start: first line that contains this text. end: first line at/after start that contains this text (inclusive). hot: lines to highlight. */
const EXCERPTS = [
  { id: 'nextState', file: 'lib/policy/lifecycle.ts', title: 'Only these events move a case', start: "case 'call.outcome': {", end: "default: { const _never: never = e.decision.outcome", hot: ["case 'CONFIRMED_LEGIT'", 'const _never: never'] },
  { id: 'decideOutcome', file: 'lib/voice/decide.ts', title: 'What has to be true before "verified"', start: 'if (said.has("yes")) {', end: 'return mk("CONFIRMED_LEGIT"', hot: ['return mk("CONFIRMED_LEGIT"'] },
  { id: 'canRelease', file: 'lib/policy/lifecycle.ts', title: 'The only gate in front of Ramp release', start: 'export function canRelease(', end: 'return { ok: false, reason: `case is', hot: ["if (!approvedBy?.trim()) return { ok: false, reason: 'approver required' };"] },
];

let commit = null;
try { commit = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim(); } catch { /* not a git checkout: leave null */ }

const excerpts = EXCERPTS.map((x) => {
  const src = readFileSync(path.join(root, x.file), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const s = src.findIndex((l) => l.includes(x.start));
  if (s < 0) throw new Error(`${x.file}: start marker not found: ${x.start}`);
  const e = src.findIndex((l, i) => i >= s && l.includes(x.end));
  if (e < 0) throw new Error(`${x.file}: end marker not found: ${x.end}`);
  const lines = src.slice(s, e + 1);
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  const hot = lines.map((l, i) => (x.hot.some((h) => l.includes(h)) ? i : -1)).filter((i) => i >= 0);
  if (hot.length !== x.hot.length) throw new Error(`${x.file}: a highlight marker was not found inside ${x.id}`);
  return { id: x.id, file: x.file, title: x.title, startLine: s + 1, lines: lines.map((l) => l.slice(indent)), hot };
});

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ commit, excerpts }, null, 2) + '\n');
console.log(`wrote ${path.relative(process.cwd(), out)}: ${excerpts.map((x) => `${x.file}:${x.startLine}-${x.startLine + x.lines.length - 1}`).join(', ')}${commit ? ` @ ${commit}` : ''}`);
