// scripts/export-run.ts (npm run export-run -- <caseId> <name> ["description"]): turn one REAL case into public/runs/<name>.json with measured gaps.
// Run after every take so `?replay=<name>` reproduces the exact screen. Gaps are capped so a long silence does not stall a replay.
import { writeFileSync } from 'node:fs';
import type { Envelope, Run, RunEvent } from '../lib/runs';
import { sql } from '../lib/store';

const [caseId, name, ...desc] = process.argv.slice(2);
if (!caseId || !name || !/^[a-z0-9-]+$/.test(name)) throw new Error('usage: npm run export-run -- <caseId> <name: a-z0-9-> ["description"]');
const MAX_GAP_MS = 8000;

const rows = await sql`select seq, id, ts, case_id, type, actor, payload from events where case_id = ${caseId} order by seq`;
if (!rows.length) throw new Error(`no events for ${caseId}`);
let prev = Date.parse(rows[0].ts as string);
const events: RunEvent[] = rows.map((r) => {
  const t = Date.parse(r.ts as string); const delay = Math.min(MAX_GAP_MS, Math.max(0, t - prev)); prev = t;
  const e: Envelope = { seq: Number(r.seq), id: r.id as string, ts: new Date(t).toISOString(), case_id: r.case_id as string, type: r.type as string, actor: r.actor as string, payload: r.payload as Record<string, unknown> };
  return { ...e, delay_ms: delay };
});
events[0].delay_ms = 0;
const run: Run = { name, description: desc.join(' ') || `Recorded run of ${caseId}`, recordedAt: new Date().toISOString(), source: 'recorded', events };
writeFileSync(new URL(`../public/runs/${name}.json`, import.meta.url), JSON.stringify(run, null, 1) + '\n');
console.log(`wrote public/runs/${name}.json: ${events.length} events, ${(events.reduce((n, e) => n + e.delay_ms, 0) / 1000).toFixed(1)}s`);
await sql.end();
