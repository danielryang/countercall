import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EmittedEvent } from './events';
import { applyHolds } from './holds';
import { closeCase, releaseCase, type ReleaseIo } from './release';
import { DbMockRampClient, type HoldClient } from './ramp.mock-db';
import { testDb } from './testing/pglite';

type T = Awaited<ReturnType<typeof testDb>>;
const io = (t: T, ramp?: (q: Parameters<ReleaseIo['ramp']>[0]) => HoldClient): ReleaseIo => ({ tx: t.tx, ramp: ramp ?? ((q) => new DbMockRampClient(q)), mode: 'mock', emit: (e) => t.emit(e) });
const decision = (outcome: 'CONFIRMED_LEGIT' | 'DENIED_FRAUD' | 'UNVERIFIED') => ({ outcome, reason: 'X', severity: 'low', challengeMatched: null, flags: [], paymentState: 'HELD' });

/** A real held case for Acme (both bills held through the mock Ramp), then driven to `to` the way the product does it: call.created, call.outcome. */
async function caseIn(t: T, to: 'held' | 'awaiting_approval' | 'fraud_blocked' | 'needs_human'): Promise<string> {
  await t.q(`update cases set archived_at = now() where archived_at is null`);
  const id = await t.heldCase('v_acme', '4321');
  await t.q(`update bills set ramp_status_summary = 'PAYMENT_SCHEDULED' where vendor_id = 'v_acme' and paid_at is null`);
  await applyHolds({ q: t.q, ramp: new DbMockRampClient(t.q), mode: 'mock', emit: (e) => t.emit(e) }, id, 'v_acme', ['pay_8101', 'pay_8102']);
  if (to === 'held') return id;
  await t.emit({ type: 'call.created', caseId: id, callId: `c_${id}`, mode: 'phone', at: 0 });
  const outcome = to === 'awaiting_approval' ? 'CONFIRMED_LEGIT' : to === 'fraud_blocked' ? 'DENIED_FRAUD' : 'UNVERIFIED';
  await t.emit({ type: 'call.outcome', caseId: id, callId: `c_${id}`, decision: decision(outcome) as never, at: 0 } as EmittedEvent);
  assert.equal(await t.stateOf(id), to);
  return id;
}
const billStatus = async (t: T) => (await t.q<{ s: string }>(`select distinct ramp_status_summary s from bills where id in ('pay_8101','pay_8102')`)).map((r) => r.s);
const types = async (t: T, id: string) => (await t.events(id)).map((e) => e.type);

test('a verified case: a named person releases it; Ramp releases both bills; exactly one payment.released with the approver', async () => {
  const t = await testDb(); const id = await caseIn(t, 'awaiting_approval');
  const r = await releaseCase(io(t), id, 'A. Patel', 'new_account_pending_ramp_approval', undefined);
  assert.deepEqual(r, { ok: true, paymentIds: ['pay_8101', 'pay_8102'] });
  assert.equal(await t.stateOf(id), 'released');
  assert.deepEqual(await billStatus(t), ['AWAITING_PAYMENT']);
  const rel = (await t.events(id)).filter((e) => e.type === 'payment.released');
  assert.equal(rel.length, 1);
  assert.deepEqual([rel[0].payload.approvedBy, rel[0].payload.destination], ['A. Patel', 'new_account_pending_ramp_approval']);
  const [c] = await t.q<{ released_by: string; released_at: string | null }>(`select released_by, released_at from cases where id = $1`, [id]);
  assert.equal(c.released_by, 'human:A. Patel'); assert.ok(c.released_at);
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from holds where case_id = $1 and state = 'released'`, [id]))[0].n, 3, 'two bill holds and the vendor hold');
});

test('releasing twice is refused: the second call is a no-op, not a second release', async () => {
  const t = await testDb(); const id = await caseIn(t, 'awaiting_approval');
  assert.equal((await releaseCase(io(t), id, 'A. Patel', 'on_file')).ok, true);
  const again = await releaseCase(io(t), id, 'A. Patel', 'on_file');
  assert.deepEqual([again.ok, !again.ok && again.status], [false, 409]);
  assert.equal((await t.events(id)).filter((e) => e.type === 'payment.released').length, 1);
});

test('a case that is only held (no outcome) cannot be released, and Ramp is not touched', async () => {
  const t = await testDb(); const id = await caseIn(t, 'held');
  const r = await releaseCase(io(t), id, 'A. Patel', 'on_file');
  assert.deepEqual([r.ok, !r.ok && r.status, !r.ok && /nothing to release/.test(r.reason)], [false, 409, true]);
  assert.deepEqual(await billStatus(t), ['ON_HOLD']);
  assert.ok(!(await types(t, id)).includes('payment.released'));
});

test('after a denial only the on-file account can be paid: the new account is refused, on-file is allowed', async () => {
  const t = await testDb(); const id = await caseIn(t, 'fraud_blocked');
  const bad = await releaseCase(io(t), id, 'A. Patel', 'new_account_pending_ramp_approval');
  assert.deepEqual([bad.ok, !bad.ok && bad.status, !bad.ok && /only the on-file account/.test(bad.reason)], [false, 409, true]);
  assert.equal(await t.stateOf(id), 'fraud_blocked');
  assert.equal((await releaseCase(io(t), id, 'A. Patel', 'on_file')).ok, true);
  assert.equal(await t.stateOf(id), 'released');
});

test('an unverified case needs a written reason of at least 10 characters (a human override)', async () => {
  const t = await testDb(); const id = await caseIn(t, 'needs_human');
  for (const note of [undefined, '', 'short']) assert.equal((await releaseCase(io(t), id, 'A. Patel', 'on_file', note)).ok, false);
  assert.equal(await t.stateOf(id), 'needs_human');
  const ok = await releaseCase(io(t), id, 'A. Patel', 'on_file', 'Called Acme AP on the number from the W-9; confirmed by hand.');
  assert.equal(ok.ok, true);
  assert.equal((await t.events(id)).find((e) => e.type === 'payment.released')!.payload.note, 'Called Acme AP on the number from the W-9; confirmed by hand.');
});

test('an unknown case is a 404, and a blank approver is refused', async () => {
  const t = await testDb(); const id = await caseIn(t, 'awaiting_approval');
  const missing = await releaseCase(io(t), 'CC-9999', 'A. Patel', 'on_file'); assert.deepEqual([missing.ok, !missing.ok && missing.status], [false, 404]);
  assert.equal((await releaseCase(io(t), id, '   ', 'on_file')).ok, false);
  assert.equal(await t.stateOf(id), 'awaiting_approval');
});

test('if Ramp fails, NOTHING changes: the case stays awaiting approval, the bills stay held, and the failure is recorded', async () => {
  const t = await testDb(); const id = await caseIn(t, 'awaiting_approval');
  const broken: HoldClient = { holdBill: async () => { throw new Error('x'); }, holdVendor: async () => { throw new Error('x'); }, releaseBill: async () => { throw new Error('ramp down'); }, releaseVendor: async () => { throw new Error('ramp down'); } };
  const r = await releaseCase(io(t, () => broken), id, 'A. Patel', 'on_file');
  assert.deepEqual([r.ok, !r.ok && r.status], [false, 502]);
  assert.equal(await t.stateOf(id), 'awaiting_approval');
  assert.deepEqual(await billStatus(t), ['ON_HOLD']);
  const ts = await types(t, id);
  assert.ok(ts.includes('payment.release_failed') && !ts.includes('payment.released'));
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from holds where case_id = $1 and state = 'released'`, [id]))[0].n, 0);
  // and it can be retried once Ramp is back
  assert.equal((await releaseCase(io(t), id, 'A. Patel', 'on_file')).ok, true);
});

test('closing a case needs a note and a legal state; it releases nothing', async () => {
  const t = await testDb(); const id = await caseIn(t, 'needs_human');
  const cio = { q: t.q, emit: (e: EmittedEvent, h?: string) => t.emit(e, h) };
  assert.equal((await closeCase(cio, id, 'A. Patel', 'no')).ok, false);
  assert.equal((await closeCase(cio, id, 'A. Patel', 'Duplicate of a case handled by hand')).ok, true);
  assert.equal(await t.stateOf(id), 'closed');
  assert.deepEqual(await billStatus(t), ['ON_HOLD'], 'closing never releases money');
  assert.equal((await closeCase(cio, id, 'A. Patel', 'again, please')).ok, false, 'a closed case is terminal');
});
