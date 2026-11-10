// scripts/make-runs.ts (npm run make:runs): generate public/runs/*.json by running the REAL pipeline on PGlite: scam email -> detection -> holds -> call -> scenario.
// Placeholder golden runs until the real recordings (scripts/export-run.ts) replace them on shoot day. Deterministic: same code => same files (modulo uuids).
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeDeps } from '../lib/detect/deps';
import { FIXTURES, fixtureToEmail, replayExtract } from '../lib/detect/fixtures';
import { ingestEmail } from '../lib/detect/ingest';
import { DbMockRampClient } from '../lib/ramp.mock-db';
import { pace, type Envelope, type Run } from '../lib/runs';
import { testDb } from '../lib/testing/pglite';
import { makeVoiceCtx } from '../lib/voice/ctx';
import { processRetellWebhook, processToolCall } from '../lib/voice/handle';
import { SCENARIOS } from '../lib/voice/scenarios';

const OUT = new URL('../public/runs/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const NAMES: Record<string, string> = { denied: 'fraud', confirmed: 'confirmed', voicemail: 'voicemail', vague: 'vague', impostor: 'impostor' };
for (const sc of SCENARIOS.filter((s) => NAMES[s.name])) {
  const t = await testDb();                                   // fresh database per run => seq and case ids start the same way every time
  const f = FIXTURES.find((x) => x.id.startsWith('01'))!;
  let callId = '';
  const deps = await makeDeps({ q: t.q, emit: (e) => t.emit(e) }, {
    rampMode: 'mock', ramp: new DbMockRampClient(t.q), callsEnabled: true, perVendorHourLimit: 100, allowedSenders: [],
    dial: async (c) => (callId = `call_${c.caseId.toLowerCase().replace(/-/g, '')}`),
  }, { provider: 'make-runs' });
  await ingestEmail(fixtureToEmail(f), { ...deps, extract: replayExtract(f) });
  const [c] = await t.q<{ id: string; challenge_expected: string }>(`select id, challenge_expected from cases order by created_at desc limit 1`);
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  for (const s of sc.build({ caseId: c.id, callId, expectedLast4: c.challenge_expected })) {
    if (s.kind === 'webhook') await processRetellWebhook(ctx, s.payload); else await processToolCall(ctx, s.payload);
  }
  const rows = await t.q<{ seq: number; id: string; ts: string; case_id: string | null; type: string; actor: string; payload: Record<string, unknown> }>(
    `select seq, id, ts, case_id, type, actor, payload from events where case_id = $1 order by seq`, [c.id]);
  const events: Envelope[] = rows.map((r) => ({ seq: Number(r.seq), id: r.id, ts: new Date(r.ts).toISOString(), case_id: r.case_id, type: r.type, actor: r.actor, payload: r.payload }));
  const run: Run = { name: NAMES[sc.name], description: sc.describes, recordedAt: '2026-11-10T18:00:00.000Z', source: 'generated', events: pace(events) };
  writeFileSync(new URL(`${run.name}.json`, OUT), JSON.stringify(run, null, 1) + '\n');
  console.log(`${run.name.padEnd(10)} ${String(run.events.length).padStart(3)} events  ${(run.events.reduce((n, e) => n + e.delay_ms, 0) / 1000).toFixed(1)}s  -> ${sc.expected.state}`);
}
