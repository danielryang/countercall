// scripts/make-runs.ts (npm run make:runs): generate public/runs/*.json by running the REAL pipeline on PGlite: scam email -> detection -> holds -> call -> scenario.
// Placeholder golden runs until the real recordings (scripts/export-run.ts) replace them on shoot day. Deterministic: same code => same files (modulo uuids).
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeDeps } from '../lib/detect/deps';
import { FIXTURES, fixtureToEmail, replayExtract } from '../lib/detect/fixtures';
import { ingestEmail } from '../lib/detect/ingest';
import { DbMockRampClient } from '../lib/ramp.mock-db';
import { pace, type Envelope, type Run, type RunEvent } from '../lib/runs';
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
  const seedIds: string[] = [];                               // seeded history first: the queue must look like a real inbox where the detector does not flag everything
  for (const id of ['07', '09', '10', '19']) {
    const sf = FIXTURES.find((x) => x.id.startsWith(id))!; const se = fixtureToEmail(sf);
    await ingestEmail(se, { ...deps, extract: replayExtract(sf) });
    seedIds.push((await t.q<{ id: string }>(`select id from cases where email_provider_event_id = $1`, [se.providerEventId]))[0].id);
  }
  const hero = fixtureToEmail(f);
  await ingestEmail(hero, { ...deps, extract: replayExtract(f) });
  const [c] = await t.q<{ id: string; challenge_expected: string }>(`select id, challenge_expected from cases where email_provider_event_id = $1`, [hero.providerEventId]);
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  for (const s of sc.build({ caseId: c.id, callId, expectedLast4: c.challenge_expected })) {
    if (s.kind === 'webhook') await processRetellWebhook(ctx, s.payload); else await processToolCall(ctx, s.payload);
  }
  const rows = await t.q<{ seq: number; id: string; ts: string; case_id: string | null; type: string; actor: string; payload: Record<string, unknown> }>(
    `select seq, id, ts, case_id, type, actor, payload from events where case_id is not null order by seq`);
  const all: Envelope[] = rows.map((r) => ({ seq: Number(r.seq), id: r.id, ts: new Date(r.ts).toISOString(), case_id: r.case_id, type: r.type, actor: r.actor, payload: r.payload }));
  const history = all.filter((e) => seedIds.includes(e.case_id!)).map((e, i): RunEvent => ({ ...e, ts: new Date(Date.parse('2026-11-09T15:00:00.000Z') + i * 90_000).toISOString(), delay_ms: 0 }));   // instant, dated yesterday
  const run: Run = { name: NAMES[sc.name], description: sc.describes, recordedAt: '2026-11-10T18:00:00.000Z', source: 'generated',
    events: [...history, ...pace(all.filter((e) => e.case_id === c.id))].map((e, i) => (i === history.length ? { ...e, delay_ms: 600 } : e)) };
  writeFileSync(new URL(`${run.name}.json`, OUT), JSON.stringify(run, null, 1) + '\n');
  console.log(`${run.name.padEnd(10)} ${String(run.events.length).padStart(3)} events (${history.length} seeded history)  ${(run.events.reduce((n, e) => n + e.delay_ms, 0) / 1000).toFixed(1)}s  -> ${sc.expected.state}`);
}
