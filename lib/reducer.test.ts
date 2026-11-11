import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { apply, initial, reduce, type Ev } from './reducer';
import type { Run } from './runs';
import { HISTORY } from './detect/history';
import { fmtCents, GROUP_OF, heldCents, queue } from './selectors';

const run = (name: string): Run => JSON.parse(readFileSync(new URL(`../public/runs/${name}.json`, import.meta.url), 'utf8'));
const FINAL: Record<string, string> = { fraud: 'fraud_blocked', confirmed: 'awaiting_approval', voicemail: 'needs_human', vague: 'needs_human', impostor: 'needs_human' };
const only = (r: Run) => r.events.find((e) => e.type === 'call.requested')!.case_id!;   // the hero case; earlier cases are seeded history

test('every recorded run replays to the expected terminal state, with the money still held', () => {
  for (const [name, state] of Object.entries(FINAL)) {
    const r = run(name); const s = reduce(r.events); const c = s.cases[only(r)];
    assert.equal(c.state, state, name);
    assert.equal(c.payments.length, 2, `${name}: two Acme bills`);
    assert.equal(heldCents(s), 2_480_000, `${name}: $24,800 frozen, nothing released`);
    assert.equal(c.release, undefined, `${name}: no release without payment.released`);
  }
});

test('the fraud run tells the story in order: scanning -> flagged -> held -> calling -> fraud_blocked', () => {
  const r = run('fraud'); const seen: string[] = [];
  let s = initial;
  for (const e of r.events) { s = apply(s, e); const st = s.cases[only(r)]?.state; if (st && seen.at(-1) !== st) seen.push(st); }   // the hero appears after the seeded history
  assert.deepEqual(seen, ['scanning', 'flagged', 'held', 'calling', 'fraud_blocked']);
  const c = s.cases[only(r)];
  assert.equal(c.call?.status, 'ended');
  assert.equal(c.call?.outcome?.decision.outcome, 'DENIED_FRAUD');
  assert.ok(c.trusted?.phoneMasked.includes('•'), 'only the masked number reaches the UI');
  assert.ok(c.email && c.spans.length > 0 && c.signals.length > 0, 'email, evidence spans and signals are present for the sweep');
  assert.ok(c.rampCalls.some((x) => x.path.endsWith('/hold')), 'Ramp calls are recorded for the API chip');
});

test('status comes only from case.state: without those events a case stays scanning even after an outcome', () => {
  const r = run('fraud'); const s = reduce(r.events.filter((e) => e.type !== 'case.state'));
  assert.equal(s.cases[only(r)].state, 'scanning');
  assert.equal(s.cases[only(r)].call?.outcome?.decision.outcome, 'DENIED_FRAUD', 'the outcome is data; it does not move the status');
});

test('idempotent: every event applied twice, or the whole run applied twice, equals once', () => {
  const r = run('confirmed'); const once = reduce(r.events);
  assert.deepEqual(reduce(r.events.flatMap((e) => [e, e])), once);
  assert.deepEqual(reduce(r.events, once), once);
});

test('snapshot + stream equals the full replay at every cut point', () => {
  const r = run('impostor'); const full = reduce(r.events);
  for (let k = 0; k <= r.events.length; k++) assert.deepEqual(reduce(r.events.slice(k), reduce(r.events.slice(0, k))), full, `cut at ${k}`);
});

test('the transcript is REPLACED by each snapshot, never appended', () => {
  const r = run('confirmed'); const deltas = r.events.filter((e) => e.type === 'call.transcript.delta');
  const s = reduce(r.events.slice(0, r.events.indexOf(deltas[1]) + 1));
  const items = (deltas[1].payload as { items: unknown[] }).items;
  assert.equal(s.cases[only(r)].call?.turns.length, items.length);
});

test('late events from a different call never overwrite the current call', () => {
  const r = run('fraud'); const s = reduce(r.events); const c = s.cases[only(r)];
  const stale: Ev = { seq: s.lastSeq + 1, id: 'x', ts: '2026-11-10T19:00:00.000Z', case_id: only(r), type: 'call.status', actor: 'voice_agent', payload: { callId: 'some_other_call', status: 'connected' } };
  const after = apply(s, stale);
  assert.equal(after.cases[only(r)].call?.id, c.call?.id);
  assert.equal(after.cases[only(r)].call?.status, 'ended');
});

test('unknown event types advance lastSeq and change nothing else', () => {
  const s = reduce(run('fraud').events);
  const e: Ev = { seq: s.lastSeq + 5, id: 'u', ts: '2026-11-10T19:00:00.000Z', case_id: only(run('fraud')), type: 'future.event', actor: 'system', payload: {} };
  const after = apply(s, e);
  assert.equal(after.lastSeq, e.seq);
  assert.deepEqual(after.cases[only(run('fraud'))].state, s.cases[only(run('fraud'))].state);
});

test('system.reset drops live cases above keepThrough, keeps seeded history, and ignores late pre-reset events', () => {
  const r = run('fraud'); const s = reduce(r.events);                       // seeded history first, then the hero
  const seeded = HISTORY.length; const lastSeeded = 99 + seeded;
  assert.equal(Object.keys(s.cases).length, seeded + 1);
  const reset: Ev = { seq: s.lastSeq + 1, id: 'r', ts: '2026-11-10T19:00:00.000Z', case_id: null, type: 'system.reset', actor: 'system', payload: { keepThrough: lastSeeded } };
  const after = apply(s, reset);
  assert.equal(Object.keys(after.cases).length, seeded);
  assert.ok(!(only(r) in after.cases), 'the live hero case is dropped, seeded history stays');
  assert.equal(heldCents(after), 0, 'the frozen money went with the live case');
  assert.equal(apply(after, r.events.find((e) => e.case_id === only(r))!).order.length, seeded, 'a replayed pre-reset event is ignored');
});

test('queue groups follow the state mapping and money formats as dollars', () => {
  const r = run('voicemail'); const s = reduce(r.events); const q = queue(s);
  assert.equal(q['NEEDS ACTION'].length, 1);
  assert.equal(GROUP_OF.calling, 'IN PROGRESS'); assert.equal(GROUP_OF.cleared, 'RESOLVED');
  assert.equal(fmtCents(heldCents(s)), '$24,800.00');
});

test('a live transcript update that lands after the final transcript never replaces it (Retell does not wait for one delivery before sending the next)', () => {
  const r = run('fraud'); const s = reduce(r.events); const id = only(r); const final = s.cases[id].call!;
  assert.equal(final.transcriptFinal, true);
  assert.ok(final.turns.length > 0);
  const delta = r.events.find((e) => e.type === 'call.transcript.delta' && e.case_id === id)!;
  const late: Ev = { ...delta, seq: s.lastSeq + 1, payload: { ...delta.payload, items: [], final: false } };
  assert.deepEqual(apply(s, late).cases[id].call!.turns, final.turns);
});
