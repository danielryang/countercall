import assert from 'node:assert/strict';
import { before, beforeEach, test } from 'node:test';
import { startCall, type CallDeps } from './call';
import { testDb } from './testing/pglite';
import type { CaseForCall } from './voice/retell';

type T = Awaited<ReturnType<typeof testDb>>;
let t: T;
before(async () => { t = await testDb(); });
beforeEach(async () => { await t.q(`update calls set ended_at = now() where ended_at is null`); });   // calls from earlier tests are finished

const ctx = { vendorName: 'Acme Corp', requestSummary: 'The request arrived by email on Monday.' };
const deps = (over: Partial<CallDeps> & { dialed?: CaseForCall[] } = {}): CallDeps => {
  const { dialed = [], ...rest } = over;
  return { q: t.q, emit: (e) => t.emit(e), createTask: t.createTask, callsEnabled: true, perVendorHourLimit: 3,
    dial: async (c) => { dialed.push(c); return `retell_${c.caseId}_${c.attempt}`; }, ...rest };
};
const tasksOf = async (caseId: string) => (await t.q<{ reason: string }>(`select reason from tasks where case_id = $1`, [caseId])).map((r) => r.reason);

test('starts a call to the PRIMARY trusted number, derives the challenge server-side, reserves the row, and moves held -> calling', async () => {
  const caseId = await t.heldCase(); const dialed: CaseForCall[] = [];
  const r = await startCall(deps({ dialed }), caseId, 'v_acme', ctx);
  assert.equal(r.started, true);
  assert.equal(dialed.length, 1);
  assert.equal(dialed[0].trustedPhoneE164, '+14155550142', 'primary trusted contact, not the quarantined +13025550199 and not the backup');
  assert.equal(dialed[0].attempt, 1);
  assert.match(dialed[0].challengePrompt, /most recent bill we paid/);
  assert.equal(await t.stateOf(caseId), 'calling');
  const [row] = await t.q<{ challenge_expected: string; challenge_kind: string; call_attempts: number }>(`select challenge_expected, challenge_kind, call_attempts from cases where id = $1`, [caseId]);
  assert.deepEqual([row.challenge_expected, row.challenge_kind, row.call_attempts], ['4388', 'last_paid_invoice_last4', 1]);
  const [call] = await t.q<{ retell_call_id: string }>(`select retell_call_id from calls where case_id = $1`, [caseId]);
  assert.equal(call.retell_call_id, `retell_${caseId}_1`);
});

test('the challenge secret and the full phone number never reach an event, the dial prompt, or a task', async () => {
  const caseId = await t.heldCase('v_globex', null);
  const dialed: CaseForCall[] = [];
  await startCall(deps({ dialed }), caseId, 'v_globex', { vendorName: 'Globex', requestSummary: 'x' });
  const blob = JSON.stringify(await t.events(caseId));
  assert.ok(!blob.includes('7655'), 'expected digits (Globex last paid invoice 7655) must not be in any event');
  assert.ok(!blob.includes('+14155550177'), 'no full phone number in events');
  assert.ok(!JSON.stringify(dialed[0].challengePrompt).includes('7655'));
});

test('CALLS_ENABLED=0 refuses to dial and hands the case to a human', async () => {
  const caseId = await t.heldCase(); const dialed: CaseForCall[] = [];
  const r = await startCall(deps({ callsEnabled: false, dialed }), caseId, 'v_acme', ctx);
  assert.equal(r.started, false); assert.equal(dialed.length, 0);
  assert.equal(await t.stateOf(caseId), 'needs_human');
  assert.deepEqual(await tasksOf(caseId), ['calls disabled (CALLS_ENABLED=0)']);
});

test('a case that is not held or needs_human is never called', async () => {
  const [c] = await t.q<{ id: string }>(`insert into cases (source, vendor_id) values ('email','v_acme') returning id`);   // state: scanning
  const dialed: CaseForCall[] = [];
  const r = await startCall(deps({ dialed }), c.id, 'v_acme', ctx);
  assert.equal(r.started, false); assert.equal(dialed.length, 0);
});

test('only one call per case at a time (a second start while one is open is a no-op)', async () => {
  const caseId = await t.heldCase('v_summit', null); const dialed: CaseForCall[] = [];
  assert.equal((await startCall(deps({ dialed }), caseId, 'v_summit', ctx)).started, true);
  assert.equal((await startCall(deps({ dialed }), caseId, 'v_summit', ctx)).started, false);
  assert.equal(dialed.length, 1);
});

test('a failed dial is recorded, the number is masked in the task, and the case lands on a human', async () => {
  const caseId = await t.heldCase('v_kestrel', null);
  const r = await startCall(deps({ dial: async () => { throw new Error('refusing to dial +12065550134: not on ALLOWED_DEMO_NUMBERS'); } }), caseId, 'v_kestrel', ctx);
  assert.equal(r.started, false);
  assert.equal(await t.stateOf(caseId), 'needs_human');
  const reasons = await tasksOf(caseId);
  assert.ok(reasons[0].includes('dial failed') && !reasons[0].includes('+12065550134'), 'full number must be masked');
  const [call] = await t.q<{ ended_at: string | null; disconnection_reason: string }>(`select ended_at, disconnection_reason from calls where case_id = $1`, [caseId]);
  assert.ok(call.ended_at); assert.equal(call.disconnection_reason, 'dial_failed');
});

test('a vendor with no trusted, seasoned number is refused (fail closed)', async () => {
  await t.q(`update trusted_contacts set first_seen_at = now() where vendor_id = 'v_orchard'`);   // not yet seasoned
  const caseId = await t.heldCase('v_orchard', null); const dialed: CaseForCall[] = [];
  const r = await startCall(deps({ dialed }), caseId, 'v_orchard', ctx);
  assert.equal(r.started, false); assert.equal(dialed.length, 0);
  assert.match((await tasksOf(caseId))[0], /no trusted, seasoned/);
});

test('the per-vendor hourly limit blocks the call after N attempts', async () => {
  const dialed: CaseForCall[] = [];
  const results = [];
  for (let i = 0; i < 3; i++) {
    const caseId = await t.heldCase('v_northwind', null);
    await t.q(`update calls set ended_at = now() where ended_at is null`);   // previous call finished, so only the vendor limit can refuse
    results.push((await startCall(deps({ perVendorHourLimit: 2, globalHourLimit: 100, dialed }), caseId, 'v_northwind', ctx)).started);
  }
  assert.deepEqual(results, [true, true, false]);
});
