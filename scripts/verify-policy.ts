// scripts/verify-policy.ts (npm run verify:policy): runs the exhaustive checks and prints the count behind "0 unsafe releases across N".
import { verifyAll } from '../lib/policy/exhaustive';

const t0 = Date.now();
const reports = verifyAll();
let total = 0, bad = 0;
for (const r of reports) {
  total += r.cases; bad += r.violations.length;
  console.log(`${r.violations.length ? 'FAIL' : 'ok  '} ${r.name.padEnd(14)} ${r.cases.toLocaleString('en-US').padStart(11)} cases  ${r.violations.length} violation(s)`);
  for (const v of r.violations) console.log('     ' + v);
}
console.log(`\nchecked ${total.toLocaleString('en-US')} cases exhaustively in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${bad === 0 ? '0 unsafe releases, 0 policy violations' : bad + ' VIOLATION(S)'}`);
process.exit(bad ? 1 : 0);
