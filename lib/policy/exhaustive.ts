// lib/policy/exhaustive.ts: exhaustive verification of the two deciders. Not sampling: every combination of a finite, representative input space
// is run through the real production functions and checked against safety properties. Printed by `npm run verify:policy`, asserted by the test suite.
// Why this is sound: both functions are pure and branch on a small number of input classes. Each class below has one representative per
// behavioural branch (e.g. 'dial_*' reasons share a branch, so one is enough), plus adversarial junk where the input is LLM-controlled.
import { actorOf, type CaseState, type EmittedEvent, type ReleaseDestination } from '../events';
import { decideOutcome, type Answer, type DecideInput, type Flag, type SpeakerRole } from '../voice/decide';
import { canRelease, isLegal, nextState, TERMINAL, TRANSITIONS } from './lifecycle';

export interface Report { name: string; cases: number; violations: string[] }
const MAX_REPORTED = 5;
const fail = (v: string[], msg: string) => { if (v.length < MAX_REPORTED) v.push(msg); };

// ---------------------------------------------------------------------------------------------------------------- decideOutcome
const REASONS = [null, 'agent_hangup', 'voicemail_reached', 'dial_no_answer', 'error_llm', 'max_duration_reached'];
const ANSWERS: Answer[] = ['yes', 'no', 'unsure', 'callback_requested', 'wrong_person', 'CONFIRMED_LEGIT' as Answer];   // the last is junk an injected LLM might emit
const ROLES: SpeakerRole[] = ['ar_or_finance', 'other', 'unknown'];
const EXPECTED = '4388';
const DIGITS = ['', EXPECTED, '9999', '77' + EXPECTED];                                     // none / exact / wrong / correct suffix on longer input
const EXPECTEDS = [EXPECTED, '', '12ab'];                                                    // valid, missing, malformed
const FLAG_SETS: Flag[][] = [[], ['asked_for_bank_details'], ['pressure_to_approve'], ['offered_new_contact'], ['hostile'], ['recording_declined'], ['hostile', 'pressure_to_approve'],
  ['asked_for_bank_details', 'pressure_to_approve', 'offered_new_contact', 'hostile', 'recording_declined']];
const SECOND: DecideInput['secondReader'][] = [null, 'yes', 'no', 'unsure', 'none'];
const SUSPICIOUS: Flag[] = ['asked_for_bank_details', 'pressure_to_approve', 'offered_new_contact'];

const answerSets = (() => {   // every list of 0..2 answers, each with every role
  const one = ANSWERS.flatMap((answer) => ROLES.map((speakerRole) => ({ answer, speakerRole })));
  return [[], ...one.map((a) => [a]), ...one.flatMap((a) => one.map((b) => [a, b]))];
})();
const challengeSets = (() => {   // 0..3 attempts: decideOutcome honors only the first two, so a correct THIRD must change nothing
  const one = DIGITS.map((digits) => ({ digits }));
  return [[], ...one.map((c) => [c]), ...one.flatMap((a) => one.map((b) => [a, b])), ...one.flatMap((a) => one.flatMap((b) => one.map((c) => [a, b, c])))];
})();

/** `decide` and `stopAt` exist so the mutation tests can prove this verifier FAILS on a broken policy (and stops early when it does). */
export function verifyOutcomePolicy(decide: typeof decideOutcome = decideOutcome, stopAt = Infinity): Report {
  const violations: string[] = []; let cases = 0;
  for (const disconnectionReason of REASONS) for (const answers of answerSets) for (const challenges of challengeSets) for (const flags of FLAG_SETS)
    for (const expectedLast4 of EXPECTEDS) for (const secondReader of SECOND) {
      cases++;
      const input: DecideInput = { disconnectionReason, answers, challenges, flags, expectedLast4, secondReader };
      const d = decide(input);
      const tag = () => JSON.stringify(input);

      const said = new Set(answers.map((a) => a.answer));
      const honored = challenges.slice(0, 2).map((c) => c.digits.replace(/\D/g, ''));
      const matched = honored.some((x) => x.length >= 4 && x.slice(-4) === expectedLast4);
      // The complete, independent statement of when money may even be offered to a human (every clause is load-bearing):
      const allConditions = /^\d{4}$/.test(expectedLast4) && !flags.includes('recording_declined') && said.has('yes') && !said.has('no')
        && matched && !flags.some((f) => SUSPICIOUS.includes(f)) && secondReader === 'yes';

      if ((d.outcome === 'CONFIRMED_LEGIT') !== allConditions) fail(violations, `CONFIRMED_LEGIT iff all conditions: got ${d.outcome} but conditions=${allConditions} for ${tag()}`);
      if (d.outcome === 'CONFIRMED_LEGIT' && d.reason !== 'CHALLENGE_MATCHED') fail(violations, `CONFIRMED with reason ${d.reason}`);
      if ((d.paymentState === 'HELD_AWAITING_HUMAN_APPROVAL') !== (d.outcome === 'CONFIRMED_LEGIT')) fail(violations, `paymentState ${d.paymentState} inconsistent with ${d.outcome}`);
      if (d.paymentState !== 'HELD' && d.paymentState !== 'HELD_AWAITING_HUMAN_APPROVAL') fail(violations, `paymentState escaped the HELD family: ${d.paymentState}`);
      if (d.outcome === 'DENIED_FRAUD' && !(answers.some((a) => a.answer === 'no' && a.speakerRole === 'ar_or_finance') && !said.has('yes'))) fail(violations, `DENIED_FRAUD without an authoritative no (or with a yes) for ${tag()}`);
      if (said.size > 0 && said.has('no') && said.has('yes') && d.outcome !== 'UNVERIFIED') fail(violations, `conflicting answers must be UNVERIFIED for ${tag()}`);
      if (!/^\d{4}$/.test(expectedLast4) && d.outcome !== 'UNVERIFIED') fail(violations, `no valid challenge on record must be UNVERIFIED, got ${d.outcome}`);
      if (flags.includes('recording_declined') && d.outcome !== 'UNVERIFIED') fail(violations, `recording_declined must be UNVERIFIED, got ${d.outcome}`);
      if (answers.length === 0 && d.outcome !== 'UNVERIFIED') fail(violations, `no answer must be UNVERIFIED, got ${d.outcome}`);
      if (violations.length >= stopAt) return { name: 'decideOutcome', cases, violations };
    }
  return { name: 'decideOutcome', cases, violations };
}

// ---------------------------------------------------------------------------------------------------------------- lifecycle
const ev = (type: EmittedEvent['type'], extra: object = {}) => ({ type, caseId: 'CC-0100', ...extra }) as unknown as EmittedEvent;
const outcome = (o: 'CONFIRMED_LEGIT' | 'DENIED_FRAUD' | 'UNVERIFIED') => ev('call.outcome', { callId: 'c', decision: { outcome: o } });
/** One or more representatives for EVERY event type. The Record type makes adding a new event type a compile error until it is listed here. */
const EVENTS: Record<EmittedEvent['type'], EmittedEvent[]> = {
  'email.received': [ev('email.received')], 'email.classified': [ev('email.classified')], 'case.flagged': [ev('case.flagged')], 'case.cleared': [ev('case.cleared')],
  'payment.held': [ev('payment.held')], 'ramp.call': [ev('ramp.call')], 'call.requested': [ev('call.requested')], 'case.state': [ev('case.state')],
  'task.created': (['verify_manually', 'retry_call', 'review', 'security_escalation', 'hold_failed'] as const).map((kind) => ev('task.created', { kind })),
  'task.resolved': [ev('task.resolved')],
  'payment.released': [ev('payment.released')], 'payment.release_failed': [ev('payment.release_failed')], 'case.closed': [ev('case.closed')], 'system.reset': [ev('system.reset')],
  'call.created': [ev('call.created')], 'call.status': [ev('call.status')], 'call.transcript.delta': [ev('call.transcript.delta')], 'call.tool': [ev('call.tool')],
  'call.recording': [ev('call.recording')], 'call.outcome': [outcome('CONFIRMED_LEGIT'), outcome('DENIED_FRAUD'), outcome('UNVERIFIED')],
};
const ALL_EVENTS = Object.values(EVENTS).flat();
const STATES = Object.keys(TRANSITIONS) as CaseState[];
const isHuman = (e: EmittedEvent) => actorOf(e).startsWith('human:');

export function verifyLifecycle(next: typeof nextState = nextState): Report {
  const violations: string[] = []; let cases = 0;
  // L1-L4 over every (state, event) pair
  for (const cur of STATES) for (const e of ALL_EVENTS) {
    cases++;
    const to = next(e, cur);
    if (to === null) continue;
    if (!isLegal(cur, to)) fail(violations, `${e.type} moves ${cur} -> ${to}, which is not a legal edge`);
    if (to === 'released' && e.type !== 'payment.released') fail(violations, `${e.type} reached released`);
    if (to === 'released' && !isHuman(e)) fail(violations, `a non-human actor reached released via ${e.type}`);
    if (TERMINAL.includes(cur)) fail(violations, `terminal state ${cur} moved on ${e.type}`);
  }
  // L5: reachability. Remove every human-actor event: `released` must be unreachable from the start state. (Markov: state graph BFS == all event sequences of any length.)
  const reach = (events: EmittedEvent[]) => {
    const seen = new Set<CaseState>(['scanning']); const queue: CaseState[] = ['scanning'];
    while (queue.length) { const cur = queue.shift()!; for (const e of events) { const n = next(e, cur); cases++; if (n && !seen.has(n)) { seen.add(n); queue.push(n); } } }
    return seen;
  };
  if (reach(ALL_EVENTS.filter((e) => !isHuman(e))).has('released')) fail(violations, 'released is reachable using only machine-generated events');
  if (!reach(ALL_EVENTS).has('released')) fail(violations, 'released is unreachable even for a human (the system could never pay)');
  for (const s of STATES) if (!reach(ALL_EVENTS).has(s) && s !== 'scanning') fail(violations, `state ${s} is unreachable`);
  // L6: the voice path alone can never get a case out of calling into released
  const voiceOnly = ALL_EVENTS.filter((e) => e.type.startsWith('call.') || e.type === 'task.created');
  const fromCalling = new Set<CaseState>(['calling']); for (const e of voiceOnly) { const n = next(e, 'calling'); cases++; if (n) fromCalling.add(n); }
  if (fromCalling.has('released')) fail(violations, 'a voice event released a calling case');
  return { name: 'nextState', cases, violations };
}

// ---------------------------------------------------------------------------------------------------------------- canRelease
export function verifyCanRelease(can: typeof canRelease = canRelease): Report {
  const violations: string[] = []; let cases = 0;
  const approvers = [undefined, '', '   ', 'A. Patel']; const notes = [undefined, '', 'short', 'a long enough note'];
  const dests: ReleaseDestination[] = ['on_file', 'new_account_pending_ramp_approval'];
  for (const state of STATES) for (const approver of approvers) for (const note of notes) for (const dest of dests) {
    cases++;
    const r = can(state, approver, note, dest);
    const expect = !!approver?.trim() && (state === 'awaiting_approval' || (state === 'fraud_blocked' && dest === 'on_file') || (state === 'needs_human' && (note?.trim().length ?? 0) >= 10));
    if (r.ok !== expect) fail(violations, `canRelease(${state}, ${JSON.stringify(approver)}, ${JSON.stringify(note)}, ${dest}) = ${r.ok}, want ${expect}`);
    if (r.ok && !['awaiting_approval', 'fraud_blocked', 'needs_human'].includes(state)) fail(violations, `release allowed from ${state}`);
  }
  return { name: 'canRelease', cases, violations };
}

export const verifyAll = (): Report[] => [verifyOutcomePolicy(), verifyLifecycle(), verifyCanRelease()];
