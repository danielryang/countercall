import { Retell } from 'retell-sdk';
import assert from 'node:assert/strict';
import { before, beforeEach, test } from 'node:test';
import { startCall } from '../call';
import { testDb } from '../testing/pglite';
import { makeVoiceCtx } from './ctx';
import { processRetellWebhook, processToolCall } from './handle';
import { applyVariant, SCENARIOS, type Variant } from './scenarios';
import { verifyRetell } from './retell';

type T = Awaited<ReturnType<typeof testDb>>;
let t: T; let n = 0;
before(async () => { t = await testDb(); });
beforeEach(async () => { await t.q(`update calls set ended_at = now() where ended_at is null`); });

async function play(name: string, variant: Variant) {
  const sc = SCENARIOS.find((s) => s.name === name)!;
  const caseId = await t.heldCase('v_acme', '4321');
  const callId = `call_${name}_${variant}_${n++}`;
  const started = await startCall({ q: t.q, emit: (e) => t.emit(e), createTask: t.createTask, callsEnabled: true, perVendorHourLimit: 1000, globalHourLimit: 1000, dial: async () => callId },
    caseId, 'v_acme', { vendorName: 'Acme Corp', requestSummary: 'x' });
  assert.equal(started.started, true);
  const [{ challenge_expected }] = await t.q<{ challenge_expected: string }>(`select challenge_expected from cases where id = $1`, [caseId]);
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  for (const step of applyVariant(sc.build({ caseId, callId, expectedLast4: challenge_expected }), variant)) {
    if (step.kind === 'webhook') await processRetellWebhook(ctx, step.payload); else await processToolCall(ctx, step.payload);
  }
  return { sc, caseId, callId };
}

for (const sc of SCENARIOS) for (const variant of ['normal', 'duplicated', 'analyzed_before_ended'] as Variant[]) {
  test(`${sc.name} (${variant}): ${sc.describes}`, async () => {
    const { caseId, callId } = await play(sc.name, variant);
    const events = await t.events(caseId);
    const outcomes = events.filter((e) => e.type === 'call.outcome');
    assert.equal(outcomes.length, 1, 'exactly one outcome, however many times the webhooks arrive and in whatever order');
    const d = outcomes[0].payload.decision as { outcome: string; reason: string };
    assert.deepEqual([d.outcome, d.reason], [sc.expected.outcome, sc.expected.reason]);
    assert.equal(await t.stateOf(caseId), sc.expected.state);
    assert.ok(!events.some((e) => e.type === 'payment.released'), 'nothing in the voice path can release money');
    const [call] = await t.q<{ outcome: string; ended_at: string | null }>(`select outcome, ended_at from calls where retell_call_id = $1`, [callId]);
    assert.equal(call.outcome, sc.expected.outcome); assert.ok(call.ended_at);
  });
}

test('a call that never connects (no answer) is decided at call_ended instead of hanging in calling', async () => {
  const caseId = await t.heldCase('v_acme', '4321'); const callId = `call_noanswer_${n++}`;
  await startCall({ q: t.q, emit: (e) => t.emit(e), createTask: t.createTask, callsEnabled: true, perVendorHourLimit: 1000, globalHourLimit: 1000, dial: async () => callId }, caseId, 'v_acme', { vendorName: 'Acme Corp', requestSummary: 'x' });
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  const meta = { case_id: caseId, attempt: 1 };
  await processRetellWebhook(ctx, { event: 'call_ended', call: { call_id: callId, metadata: meta, disconnection_reason: 'dial_no_answer', transcript_object: [] } });
  assert.equal(await t.stateOf(caseId), 'needs_human');
  const [o] = (await t.events(caseId)).filter((e) => e.type === 'call.outcome');
  assert.equal((o.payload.decision as { reason: string }).reason, 'NO_ANSWER');
});

test('a call with no challenge on record is decided UNVERIFIED (NO_RESULT), never stuck', async () => {
  const caseId = await t.heldCase('v_acme', '4321'); const callId = `call_nochal_${n++}`;
  await startCall({ q: t.q, emit: (e) => t.emit(e), createTask: t.createTask, callsEnabled: true, perVendorHourLimit: 1000, globalHourLimit: 1000, dial: async () => callId }, caseId, 'v_acme', { vendorName: 'Acme Corp', requestSummary: 'x' });
  await t.q(`update cases set challenge_expected = null where id = $1`, [caseId]);
  const sc = SCENARIOS.find((s) => s.name === 'denied')!;
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  for (const s of sc.build({ caseId, callId, expectedLast4: '0000' })) { if (s.kind === 'webhook') await processRetellWebhook(ctx, s.payload); else await processToolCall(ctx, s.payload); }
  assert.equal(await t.stateOf(caseId), 'needs_human');
});

test('tool calls: unknown tool or missing case id is rejected and records nothing', async () => {
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  assert.equal((await processToolCall(ctx, { name: 'approve_payment', args: {}, call: { call_id: 'c', metadata: { case_id: 'CC-0100' } } })).status, 400);
  assert.equal((await processToolCall(ctx, { name: 'report_answer', args: {}, call: { call_id: 'c' } })).status, 400);
});

test('Retell signatures: valid passes; tampered, missing and wrong-key fail', async () => {
  process.env.RETELL_API_KEY = 'key_test_0123456789abcdef';
  const body = JSON.stringify({ event: 'call_ended', call: { call_id: 'x', note: 'ünï ✓' } });
  const sig = await Retell.sign(body, process.env.RETELL_API_KEY);
  const req = (b: string, s?: string) => new Request('https://app.test/api/retell/webhook', { method: 'POST', body: b, headers: s ? { 'x-retell-signature': s } : {} });
  assert.equal(await verifyRetell(body, req(body, sig)), true);
  assert.equal(await verifyRetell(body + ' ', req(body + ' ', sig)), false, 'one extra byte');
  assert.equal(await verifyRetell(body, req(body)), false, 'missing header');
  assert.equal(await verifyRetell(body, req(body, await Retell.sign(body, 'key_other_0123456789abcdef'))), false, 'wrong key');
});

test('the challenge answer the vendor speaks never reaches a stored event, yet the decision still matches it', async () => {
  const { caseId } = await play('confirmed', 'normal');
  const [{ challenge_expected }] = await t.q<{ challenge_expected: string }>(`select challenge_expected from cases where id = $1`, [caseId]);
  const blob = JSON.stringify(await t.events(caseId));
  assert.ok(!blob.includes(challenge_expected), `expected digits ${challenge_expected} must not appear in any event`);
  const [o] = (await t.events(caseId)).filter((e) => e.type === 'call.outcome');
  assert.equal((o.payload.decision as { outcome: string }).outcome, 'CONFIRMED_LEGIT', 'the policy used the real digits from the database');
});
