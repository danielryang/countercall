import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CaseState } from '../events';
import { decideOutcome, type Decision, type DecideInput } from '../voice/decide';
import { verifyAll, verifyCanRelease, verifyLifecycle, verifyOutcomePolicy } from './exhaustive';
import { canRelease, nextState } from './lifecycle';

test('every combination of the real policy functions satisfies the safety properties (millions of cases)', () => {
  const reports = verifyAll();
  for (const r of reports) assert.deepEqual(r.violations, [], `${r.name}: ${r.violations.join('; ')}`);
  const total = reports.reduce((n, r) => n + r.cases, 0);
  assert.ok(total > 20_000_000, `exhaustive space shrank to ${total}`);
});

// Mutation tests: a verifier that never fails proves nothing. Each mutant is a plausible bug; the verifier must catch every one.
const confirmed = (d: Decision): Decision => ({ ...d, outcome: 'CONFIRMED_LEGIT', reason: 'CHALLENGE_MATCHED', paymentState: 'HELD_AWAITING_HUMAN_APPROVAL' });
const mutate = (when: (d: Decision, i: DecideInput) => boolean, to: (d: Decision) => Decision) => (i: DecideInput) => { const d = decideOutcome(i); return when(d, i) ? to(d) : d; };

const decideMutants: Record<string, (i: DecideInput) => Decision> = {
  'second reader ignored': mutate((d) => d.reason === 'SECOND_READER_DISAGREES' || d.reason === 'ANALYSIS_MISSING', confirmed),
  'wrong challenge accepted': mutate((d) => d.reason === 'CHALLENGE_MISMATCH', confirmed),
  'missing challenge accepted': mutate((d) => d.reason === 'CHALLENGE_NOT_GIVEN', confirmed),
  'suspicious flags ignored': mutate((d) => d.reason === 'SUSPICIOUS_BEHAVIOR', confirmed),
  'conflicting answers accepted': mutate((d) => d.reason === 'CONFLICTING_ANSWERS', confirmed),
  'junk answer treated as yes': mutate((d, i) => d.reason === 'UNSURE' && i.answers.some((a) => a.answer === ('CONFIRMED_LEGIT' as never)) && /^\d{4}$/.test(i.expectedLast4), confirmed),
  'non-AR "no" is authoritative': mutate((d) => d.reason === 'WRONG_PERSON', (d) => ({ ...d, outcome: 'DENIED_FRAUD', reason: 'VENDOR_DENIED' })),
  'payment state leaks': mutate((d) => d.outcome === 'UNVERIFIED', (d) => ({ ...d, paymentState: 'HELD_AWAITING_HUMAN_APPROVAL' })),
  'a third challenge attempt counts': (i) => decideOutcome({ ...i, challenges: i.challenges.length === 3 && i.challenges[2].digits.endsWith(i.expectedLast4) && i.expectedLast4 ? [i.challenges[2]] : i.challenges }),
};
for (const [name, impl] of Object.entries(decideMutants)) {
  test(`mutant caught: decideOutcome with ${name}`, () => {
    assert.ok(verifyOutcomePolicy(impl, 1).violations.length > 0, `verifier missed the mutant "${name}"`);
  });
}

const lifecycleMutants: Record<string, typeof nextState> = {
  'a machine event releases': (e, cur) => (e.type === 'call.outcome' && cur === 'calling' && (e as unknown as { decision: { outcome: string } }).decision.outcome === 'CONFIRMED_LEGIT' ? 'released' as CaseState : nextState(e, cur)),
  'a task releases from needs_human': (e, cur) => (e.type === 'task.created' && cur === 'needs_human' ? 'released' as CaseState : nextState(e, cur)),
  'a terminal state moves': (e, cur) => (cur === 'released' && e.type === 'case.closed' ? 'closed' as CaseState : nextState(e, cur)),
  'an illegal jump scanning -> calling': (e, cur) => (e.type === 'call.created' && cur === 'scanning' ? 'calling' as CaseState : nextState(e, cur)),
  'released becomes unreachable': (e, cur) => { const n = nextState(e, cur); return n === 'released' ? null : n; },
};
for (const [name, impl] of Object.entries(lifecycleMutants)) {
  test(`mutant caught: nextState with ${name}`, () => { assert.ok(verifyLifecycle(impl).violations.length > 0, `verifier missed the mutant "${name}"`); });
}

const releaseMutants: Record<string, typeof canRelease> = {
  'no approver needed': (s, _a, n, d) => canRelease(s, 'x', n, d),
  'release from held': (s, a, n, d) => (s === 'held' ? { ok: true } : canRelease(s, a, n, d)),
  'fraud_blocked may pay a new account': (s, a, n, d) => canRelease(s, a, n, s === 'fraud_blocked' ? 'on_file' : d),
  'override without a note': (s, a, _n, d) => canRelease(s, a, s === 'needs_human' ? 'a long enough note' : _n, d),
};
for (const [name, impl] of Object.entries(releaseMutants)) {
  test(`mutant caught: canRelease with ${name}`, () => { assert.ok(verifyCanRelease(impl).violations.length > 0, `verifier missed the mutant "${name}"`); });
}
