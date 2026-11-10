// scripts/preflight.ts (npm run preflight): the same readiness checks as /demo, from the CLI. Read-only: two selects, then env flags.
// Exits 1 when any check fails, so it can gate a shoot. Never prints a value, only whether each thing is set.
import { runPreflight } from '../lib/preflight-run';
import { sql, q } from '../lib/store';

const r = await runPreflight(q);
const mark = { ok: 'ok  ', warn: 'WARN', fail: 'FAIL' } as const;
for (const c of r.checks) console.log(`${mark[c.level]}  ${c.label}: ${c.detail}`);
console.log(`\n${r.ready ? 'READY' : 'NOT READY'} · ${r.fails} fail, ${r.warns} warn · ramp ${r.rampMode} · calls ${r.callsEnabled ? 'ON' : 'off'} · ${r.allowedNumbers} callable number(s)`);
await sql.end();
process.exit(r.fails ? 1 : 0);
