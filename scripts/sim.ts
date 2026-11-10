// scripts/sim.ts (npm run sim -- [--seeds N] [--start S] [--seed S]): deterministic simulation of the voice path under a hostile network.
// A failing seed prints its violations and replays identically with --seed S (fresh database, same schedule).
import { runSeed, type SeedResult } from '../lib/sim/run';
import { testDb } from '../lib/testing/pglite';

const arg = (name: string) => { const i = process.argv.indexOf('--' + name); return i > 0 ? Number(process.argv[i + 1]) : undefined; };
const single = arg('seed');
const count = single !== undefined ? 1 : (arg('seeds') ?? 200);
const start = single ?? arg('start') ?? 1;

const db = await testDb();
const t0 = Date.now(); const results: SeedResult[] = [];
for (let s = start; s < start + count; s++) {
  const r = await runSeed(db, s); results.push(r);
  if (r.violations.length) { console.log(`FAIL seed ${s} (${r.regime}, ${r.cases} calls):`); for (const m of r.violations) console.log('   - ' + m); console.log(`   replay: npm run sim -- --seed ${s}`); }
}
const sum = (f: (r: SeedResult) => number) => results.reduce((n, r) => n + f(r), 0);
const bad = results.filter((r) => r.violations.length);
console.log(`\n${count} seed(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s | benign ${results.filter((r) => r.regime === 'benign').length}, hostile ${results.filter((r) => r.regime === 'hostile').length}`
  + ` | ${sum((r) => r.cases)} calls, ${sum((r) => r.deliveries).toLocaleString('en-US')} deliveries, ${sum((r) => r.forged)} forged`
  + ` | lost-webhook strandings settled by the reaper: ${sum((r) => r.stuckBeforeReap)}`
  + `\n${bad.length ? bad.length + ' SEED(S) VIOLATED INVARIANTS' : 'all invariants held on every seed'}`);
process.exit(bad.length ? 1 : 0);
