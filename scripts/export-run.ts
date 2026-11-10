// scripts/export-run.ts (npm run export-run -- <caseId> <name> ["description"]): turn one REAL case into public/runs/<name>.json with measured gaps.
// Run after every take so `?replay=<name>` reproduces the exact screen. Gaps are capped so a long silence does not stall a replay.
import { writeFileSync } from 'node:fs';
import type { Envelope, Run, RunEvent } from '../lib/runs';
import { sql } from '../lib/store';

const [caseId, name, ...desc] = process.argv.slice(2);
if (!caseId || !name || !/^[a-z0-9-]+$/.test(name)) throw new Error('usage: npm run export-run -- <caseId> <name: a-z0-9-> ["description"]');
const MAX_GAP_MS = 8000;

// The case itself, preceded by the seeded history (so the replayed queue looks like a real inbox). Seeded events replay instantly.
const seeded = await sql`select id from cases where source = 'seed'`;
const seedIds = seeded.map((c) => c.id as string);
const rows = await sql`select seq, id, ts, case_id, type, actor, payload from events where case_id = ${caseId} or case_id = any(${seedIds}) order by seq`;
if (!rows.some((r) => r.case_id === caseId)) throw new Error(`no events for ${caseId}`);
let prev = Date.parse(rows[0].ts as string);
const events: RunEvent[] = rows.map((r) => {
  const t = Date.parse(r.ts as string);
  const isSeed = seedIds.includes(r.case_id as string);
  const delay = isSeed ? 0 : Math.min(MAX_GAP_MS, Math.max(0, t - prev)); if (!isSeed) prev = t;
  let payload = r.payload as Record<string, unknown>;
  // Recording links are signed URLs to the call audio: never commit them. Everything else in the stored payloads is already redacted (phones, spoken digits).
  if (r.type === 'call.recording') payload = { ...payload, monoUrl: null, stereoUrl: null };
  const e: Envelope = { seq: Number(r.seq), id: r.id as string, ts: new Date(t).toISOString(), case_id: r.case_id as string, type: r.type as string, actor: r.actor as string, payload };
  return { ...e, delay_ms: delay };
});
if (events.length) events[0].delay_ms = 0;
const firstLive = events.findIndex((e) => e.case_id === caseId);
if (firstLive > 0) events[firstLive].delay_ms = 600;   // a short beat between the history and the live case
const run: Run = { name, description: desc.join(' ') || `Recorded run of ${caseId}`, recordedAt: new Date().toISOString(), source: 'recorded', events };
writeFileSync(new URL(`../public/runs/${name}.json`, import.meta.url), JSON.stringify(run, null, 1) + '\n');
console.log(`wrote public/runs/${name}.json: ${events.length} events, ${(events.reduce((n, e) => n + e.delay_ms, 0) / 1000).toFixed(1)}s`);
await sql.end();
