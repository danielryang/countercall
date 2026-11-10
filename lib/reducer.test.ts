import { apply, initial, type Ev } from './reducer.ts';
import assert from 'node:assert/strict';
const ev = (seq: number, type: string, payload: any = {}, case_id = 'CC-1'): Ev => ({ seq, type, case_id, ts: '', payload });
const log: Ev[] = [
  ev(1, 'case.flagged'),
  ev(2, 'payment.held', { payment_id: 'p1', amount_cents: 4820000 }),
  ev(3, 'call.status', { status: 'connected' }),
  ev(4, 'call.transcript.delta', { turn_id: 't1', speaker: 'callee', text: 'No, we', mode: 'append', final: false }),
  ev(5, 'call.transcript.delta', { turn_id: 't1', speaker: 'callee', text: ' haven\'t', mode: 'append', final: false }),
  ev(6, 'call.transcript.delta', { turn_id: 't1', speaker: 'callee', text: 'No, we haven\'t changed banks.', mode: 'replace', final: true }),
  ev(7, 'call.outcome', { outcome: 'FRAUD' }),
];
const s = log.reduce(apply, initial);
assert.equal(s.cases['CC-1'].status, 'fraud');
assert.equal(s.cases['CC-1'].payments.p1.state, 'held', 'FRAUD outcome must NOT release money');
assert.equal(s.cases['CC-1'].call!.turns[0].text, "No, we haven't changed banks.");
assert.equal(s.cases['CC-1'].call!.turns.length, 1);
// idempotent: replaying the whole log (e.g. snapshot + stream overlap) changes nothing
assert.deepEqual(log.reduce(apply, s), s);
// immutability: earlier state untouched
const s2 = apply(s, ev(8, 'payment.released', { payment_id: 'p1' }));
assert.equal(s.cases['CC-1'].payments.p1.state, 'held');
assert.equal(s2.cases['CC-1'].payments.p1.state, 'released');
const r = apply(s2, ev(9, 'system.reset')); assert.deepEqual(r.cases, {}); assert.equal(apply(r, ev(8, 'case.flagged')).cases['CC-1'], undefined, 'pre-reset stragglers are ignored');
console.log('reducer ok');
