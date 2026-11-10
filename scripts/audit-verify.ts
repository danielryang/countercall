// scripts/audit-verify.ts (npm run audit:verify [-- --json]): same check as GET /api/audit/verify, from the CLI, against DATABASE_URL.
// Read-only. Exit 1 when the chain is broken or a case's status does not replay from the log. Not part of `npm run verify` (needs a real DB).
import { verifyAudit } from '../lib/audit';
import { q, sql } from '../lib/store';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(2); }
try {
  const r = await verifyAudit(q);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    const c = r.chain;
    if (!c.installed) console.log('chain: not installed (run npm run db:apply 003)');
    else if (c.intact) console.log(`chain: intact, ${c.checked} sealed rows, ${c.preChain} pre-chain rows (through seq ${c.preChainMaxSeq}), head #${c.head?.seq ?? '-'} ${c.head?.hash ?? '-'}`);
    else console.log(`chain: BROKEN, ${c.breaks} of ${c.checked} rows; first at #${c.firstBreak?.seq} (${c.firstBreak?.kind}) expected ${c.firstBreak?.expected ?? '-'} found ${c.firstBreak?.found ?? '-'}`);
    const p = r.replay;
    console.log(`replay: ${p.matched} of ${p.cases} cases match from ${p.events} events; ${p.outOfBand.length} started out of band (demo_replay); ${p.mismatchCount} mismatches`);
    for (const m of p.mismatches) console.log(`  ${m.caseId}: db ${m.db}, replayed ${m.replayed}, projected ${m.projected} (${m.reason}${m.atSeq == null ? '' : ` at #${m.atSeq}`})`);
    console.log(`${r.ok ? 'ok' : 'NOT OK'} in ${r.ms} ms`);
  }
  process.exitCode = r.ok ? 0 : 1;
} finally {
  await sql.end();
}
