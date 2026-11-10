import assert from 'node:assert/strict';
import { before, beforeEach, test } from 'node:test';
import { DbMockRampClient } from '../ramp.mock-db';
import { testDb } from '../testing/pglite';
import { makeVoiceCtx } from '../voice/ctx';
import { processRetellWebhook, processToolCall } from '../voice/handle';
import type { CaseForCall } from '../voice/retell';
import { SCENARIOS } from '../voice/scenarios';
import { makeDeps, type DepsConfig } from './deps';
import { FIXTURES, fixtureToEmail, replayExtract } from './fixtures';
import { ingestEmail } from './ingest';
import type { NormalizedEmail } from './types';

// The whole S2 + S9 path on the real schema: email -> detect -> case row -> Ramp holds -> call request -> dial -> Retell webhooks -> outcome.
type T = Awaited<ReturnType<typeof testDb>>;
let t: T; let dialed: CaseForCall[]; let n = 0;
before(async () => { t = await testDb(); });
beforeEach(async () => {
  dialed = [];
  await t.q(`update calls set ended_at = now() where ended_at is null`);
  await t.q(`update cases set archived_at = now() where archived_at is null`);   // each test starts with no open case (the duplicate-request rule is per bank change)
});

const cfg = (over: Partial<DepsConfig> = {}): DepsConfig => ({
  rampMode: 'mock', ramp: new DbMockRampClient(t.q), callsEnabled: true, perVendorHourLimit: 1000, allowedSenders: [],
  dial: async (c) => { dialed.push(c); return `pipe_${n++}_${c.caseId}`; }, ...over });
const fx = (id: string) => FIXTURES.find((f) => f.id.startsWith(id))!;
async function ingest(id: string, over: Partial<DepsConfig> = {}, tweak: (e: NormalizedEmail) => NormalizedEmail = (e) => e) {
  const f = fx(id);
  const deps = await makeDeps({ q: t.q, emit: (e) => t.emit(e) }, cfg(over), { provider: 'test' });
  const email = tweak(fixtureToEmail(f));
  await ingestEmail(email, { ...deps, extract: replayExtract(f) });
  const [c] = await t.q<{ id: string; state: string }>(`select id, state from cases where email_provider_event_id = $1`, [email.providerEventId]);
  return { email, caseId: c.id, state: c.state, deps, f };
}
const typesOf = async (caseId: string) => (await t.events(caseId)).map((e) => e.type);
const stateChain = async (caseId: string) => (await t.events(caseId)).filter((e) => e.type === 'case.state').map((e) => `${e.payload.from}>${e.payload.to}`);

test('hero: scam email -> flagged -> two Acme bills held -> call requested -> dialed to the PRIMARY on-file number -> calling', async () => {
  const { caseId, state } = await ingest('01');
  assert.equal(state, 'calling');
  assert.deepEqual(await stateChain(caseId), ['scanning>flagged', 'flagged>held', 'held>calling']);
  const types = await typesOf(caseId);
  for (const want of ['email.received', 'email.classified', 'case.flagged', 'payment.held', 'ramp.call', 'call.requested', 'call.created']) assert.ok(types.includes(want), `missing ${want}`);
  const held = (await t.events(caseId)).find((e) => e.type === 'payment.held')!.payload as { bills: { amountCents: number; state: string }[]; vendorHold: string; rampMode: string };
  assert.equal(held.bills.reduce((n, b) => n + b.amountCents, 0), 2_480_000, '$24,800 across two Acme bills');
  assert.deepEqual([held.vendorHold, held.rampMode, held.bills.every((b) => b.state === 'applied')], ['applied', 'mock', true]);
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from bills where vendor_id = 'v_acme' and ramp_status_summary = 'ON_HOLD'`))[0].n, 2);
  assert.equal(dialed.length, 1);
  assert.equal(dialed[0].trustedPhoneE164, '+14155550142', 'the on-file number, never one from the email');
  const [row] = await t.q<{ vendor_id: string; challenge_expected: string; bank_key: string }>(`select vendor_id, challenge_expected, bank_key from cases where id = $1`, [caseId]);
  assert.deepEqual([row.vendor_id, row.challenge_expected, !!row.bank_key], ['v_acme', '4388', true]);
  const blob = JSON.stringify(await t.events(caseId));
  assert.ok(!blob.includes('+14155550142'), 'no full on-file number in any event');
  assert.match((await t.events(caseId)).find((e) => e.type === 'call.requested')!.payload.phoneMasked as string, /^\+1 \(415\)/);
});

test('then the vendor DENIES on the phone: the case ends fraud_blocked and the bills stay held', async () => {
  const { caseId } = await ingest('01');
  const callId = dialed.length ? (await t.q<{ retell_call_id: string }>(`select retell_call_id from calls where case_id = $1`, [caseId]))[0].retell_call_id : '';
  const ctx = makeVoiceCtx(t.q, (e) => t.emit(e));
  for (const s of SCENARIOS.find((x) => x.name === 'denied')!.build({ caseId, callId, expectedLast4: '4388' })) {
    if (s.kind === 'webhook') await processRetellWebhook(ctx, s.payload); else await processToolCall(ctx, s.payload);
  }
  assert.equal((await t.q<{ state: string }>(`select state from cases where id = $1`, [caseId]))[0].state, 'fraud_blocked');
  assert.deepEqual(await stateChain(caseId), ['scanning>flagged', 'flagged>held', 'held>calling', 'calling>fraud_blocked']);
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from bills where vendor_id = 'v_acme' and ramp_status_summary = 'ON_HOLD'`))[0].n, 2);
});

test('a webhook delivered twice creates exactly one case (and one call)', async () => {
  const f = fx('01'); const email = fixtureToEmail(f);
  const deps = await makeDeps({ q: t.q, emit: (e) => t.emit(e) }, cfg(), { provider: 'test' });
  assert.ok(await ingestEmail(email, { ...deps, extract: replayExtract(f) }));
  assert.equal(await ingestEmail(email, { ...deps, extract: replayExtract(f) }), null);
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from cases where email_provider_event_id = $1`, [email.providerEventId]))[0].n, 1);
  assert.equal(dialed.length, 1);
});

test('a second email for the SAME bank change gets a duplicate task, not a second call', async () => {
  const first = await ingest('01'); dialed = [];
  const again = await ingest('01');   // fresh providerEventId, same claimed bank details
  assert.equal(dialed.length, 0);
  assert.equal(again.state, 'needs_human');
  const [task] = await t.q<{ title: string }>(`select title from tasks where case_id = $1`, [again.caseId]);
  assert.match(task.title, /Duplicate/);
  assert.equal(first.state, 'calling');
});

test('a sender that is not on the inbound allowlist is flagged and recorded but never holds or calls', async () => {
  const { caseId, state } = await ingest('01', { allowedSenders: ['trusted.example'] }, (e) => ({ ...e, source: 'agentmail' }));
  assert.equal(state, 'needs_human');
  const types = await typesOf(caseId);
  assert.ok(types.includes('case.flagged') && !types.includes('payment.held') && !types.includes('call.requested'));
  assert.equal(dialed.length, 0);
});

test('CALLS_ENABLED=0: the bills are still held, the case goes to a human, nothing is dialed', async () => {
  const { caseId, state } = await ingest('01', { callsEnabled: false });
  assert.equal(state, 'needs_human');
  assert.ok((await typesOf(caseId)).includes('payment.held'));
  assert.equal(dialed.length, 0);
  const [task] = await t.q<{ reason: string }>(`select reason from tasks where case_id = $1`, [caseId]);
  assert.match(task.reason, /calls disabled/);
});

test('a benign invoice is cleared; an executive-wire scam gets a task and no hold', async () => {
  const ok = await ingest('07'); assert.equal(ok.state, 'cleared');
  assert.ok(!(await typesOf(ok.caseId)).includes('payment.held'));
  const wire = await ingest('06'); assert.equal(wire.state, 'needs_human');
  assert.ok(!(await typesOf(wire.caseId)).includes('payment.held'));
  assert.equal(dialed.length, 0);
});
