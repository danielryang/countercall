import assert from 'node:assert/strict';
import { before, beforeEach, test } from 'node:test';
import { startCall } from '../call';
import { testDb } from '../testing/pglite';
import { makeVoiceCtx } from './ctx';
import { processRetellWebhook, processToolCall } from './handle';
import { reapStaleCalls } from './reap';
import { SCENARIOS } from './scenarios';

type T = Awaited<ReturnType<typeof testDb>>;
let t: T; let n = 0;
before(async () => { t = await testDb(); });
beforeEach(async () => { await t.q(`update calls set ended_at = now() where ended_at is null`); });
const reap = (ms: number) => reapStaleCalls({ q: t.q, ctx: makeVoiceCtx(t.q, (e) => t.emit(e)), createTask: t.createTask }, ms);
const open = async (callId: string | null) => {
  const caseId = await t.heldCase('v_acme', '4321');
  await startCall({ q: t.q, emit: (e) => t.emit(e), createTask: t.createTask, callsEnabled: true, perVendorHourLimit: 1000, globalHourLimit: 1000, dial: async () => callId ?? 'x' },
    caseId, 'v_acme', { vendorName: 'Acme Corp', requestSummary: 'x' });
  return caseId;
};

test('a call whose analysis webhook was lost is settled by policy (UNVERIFIED -> needs_human), not left in calling', async () => {
  const callId = `reap_a_${n++}`; const caseId = await open(callId);
  assert.equal(await t.stateOf(caseId), 'calling');
  assert.equal(await reap(10 * 60 * 1000), 0, 'a fresh call is not stale');
  assert.equal(await reap(0), 1);
  assert.equal(await t.stateOf(caseId), 'needs_human');
  const [o] = (await t.events(caseId)).filter((e) => e.type === 'call.outcome');
  assert.equal((o.payload.decision as { outcome: string }).outcome, 'UNVERIFIED');
  assert.equal(await reap(0), 0, 'idempotent');
});

test('a clear recorded NO still blocks when only the analysis webhook was lost', async () => {
  const callId = `reap_b_${n++}`; const caseId = await open(callId);
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  const sc = SCENARIOS.find((s) => s.name === 'denied')!;
  for (const s of sc.build({ caseId, callId, expectedLast4: '4388' }).filter((x) => x.kind === 'tool' || (x.kind === 'webhook' && x.payload.event !== 'call_analyzed' && x.payload.event !== 'call_ended'))) {
    if (s.kind === 'tool') await processToolCall(ctx, s.payload); else await processRetellWebhook(ctx, s.payload);
  }
  assert.equal(await t.stateOf(caseId), 'calling');
  await reap(0);
  assert.equal(await t.stateOf(caseId), 'fraud_blocked');
});

test('a yes + right digits with the analysis lost is NOT confirmed (second reader missing) -> needs_human', async () => {
  const callId = `reap_c_${n++}`; const caseId = await open(callId);
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  const sc = SCENARIOS.find((s) => s.name === 'confirmed')!;
  for (const s of sc.build({ caseId, callId, expectedLast4: '4388' }).filter((x) => x.kind === 'tool')) if (s.kind === 'tool') await processToolCall(ctx, s.payload);
  await reap(0);
  assert.equal(await t.stateOf(caseId), 'needs_human');
});

test('a call row that never got a Retell id is closed and the case is handed to a human', async () => {
  const caseId = await t.heldCase('v_acme', '4321');
  await t.q(`insert into calls (case_id, vendor_id, contact_id, attempt) select $1, 'v_acme', id, 1 from trusted_contacts where vendor_id = 'v_acme' and is_primary`, [caseId]);
  assert.equal(await reap(0), 1);
  assert.equal(await t.stateOf(caseId), 'needs_human');
  const [c] = await t.q<{ ended_at: string | null; disconnection_reason: string }>(`select ended_at, disconnection_reason from calls where case_id = $1`, [caseId]);
  assert.ok(c.ended_at); assert.equal(c.disconnection_reason, 'dial_unknown');
});

// Found by the simulator (seed 11 and 7 others): call_ended arrived, call_analyzed was lost. ended_at is set, but the call was never decided.
test('regression: a call that ENDED but whose analysis was lost is still settled', async () => {
  const callId = `reap_d_${n++}`; const caseId = await open(callId);
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  await processRetellWebhook(ctx, { event: 'call_ended', call: { call_id: callId, metadata: { case_id: caseId, attempt: 1 }, disconnection_reason: 'agent_hangup', transcript_object: [] } });
  const [c] = await t.q<{ ended_at: string | null; outcome: string | null }>(`select ended_at, outcome from calls where retell_call_id = $1`, [callId]);
  assert.ok(c.ended_at && !c.outcome, 'precondition: ended but undecided');
  assert.equal(await t.stateOf(caseId), 'calling');
  assert.equal(await reap(0), 1);
  assert.equal(await t.stateOf(caseId), 'needs_human');
});
