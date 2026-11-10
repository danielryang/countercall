// lib/policy/lifecycle.ts: the case state machine as DATA + two pure functions. Mirrors db/001_schema.sql case_transitions
// (scripts/db-check.ts asserts the two are identical). LLM output never appears here except as a typed CallEvent already reduced by decideOutcome().
import type { CaseState, EmittedEvent, ReleaseDestination } from '../events';

export const TRANSITIONS: Record<CaseState, readonly CaseState[]> = {
  scanning: ['cleared', 'flagged', 'needs_human'],
  flagged: ['held', 'needs_human'],
  held: ['calling', 'needs_human', 'closed'],
  calling: ['awaiting_approval', 'fraud_blocked', 'needs_human'],
  needs_human: ['calling', 'released', 'closed'],
  awaiting_approval: ['released', 'closed'],
  fraud_blocked: ['released', 'closed'],
  cleared: [], released: [], closed: [],
};
export const TERMINAL: readonly CaseState[] = ['cleared', 'released', 'closed'];
export const isLegal = (from: CaseState, to: CaseState) => TRANSITIONS[from].includes(to);

/** Which event moves the case, and to where. null = the event is information only. Single table for "which event causes each transition". */
export function nextState(e: EmittedEvent, cur: CaseState): CaseState | null {
  switch (e.type) {
    case 'case.cleared': return cur === 'scanning' ? 'cleared' : null;
    case 'case.flagged': return cur === 'scanning' ? 'flagged' : null;
    case 'payment.held': return cur === 'flagged' ? 'held' : null;
    case 'task.created': return (cur === 'scanning' || cur === 'flagged' || cur === 'held') && e.kind !== 'retry_call' ? 'needs_human' : null;   // fail closed: any pipeline problem lands on a human
    case 'call.created': return cur === 'held' || cur === 'needs_human' ? 'calling' : null;
    case 'call.outcome': {
      if (cur !== 'calling') return null;
      switch (e.decision.outcome) {                       // exhaustive: a new Outcome is a compile error here
        case 'CONFIRMED_LEGIT': return 'awaiting_approval';
        case 'DENIED_FRAUD': return 'fraud_blocked';
        case 'UNVERIFIED': return 'needs_human';
        default: { const _never: never = e.decision.outcome; return _never; }
      }
    }
    case 'payment.released': return cur === 'awaiting_approval' || cur === 'fraud_blocked' || cur === 'needs_human' ? 'released' : null;
    case 'case.closed': return isLegal(cur, 'closed') ? 'closed' : null;
    case 'email.received': case 'email.classified': case 'ramp.call': case 'call.requested': case 'case.state': case 'task.resolved':
    case 'payment.release_failed': case 'system.reset': case 'call.status': case 'call.transcript.delta': case 'call.tool': case 'call.recording':
      return null;
    default: { const _never: never = e; return _never; }
  }
}

export type ReleaseCheck = { ok: true } | { ok: false; reason: string };
export const OVERRIDE_NOTE_MIN = 10;
/** The only gate in front of Ramp /release. Called by POST /api/cases/:id/release; a human is always the caller. */
export function canRelease(state: CaseState, approvedBy: string | undefined, note: string | undefined, destination: ReleaseDestination): ReleaseCheck {
  if (!approvedBy?.trim()) return { ok: false, reason: 'approver required' };
  if (state === 'awaiting_approval') return { ok: true };                        // call CONFIRMED_LEGIT + human approves; either destination
  if (state === 'fraud_blocked') return destination === 'on_file' ? { ok: true } : { ok: false, reason: 'after a denied change only the on-file account can be paid' };
  if (state === 'needs_human') return (note?.trim().length ?? 0) >= OVERRIDE_NOTE_MIN ? { ok: true } : { ok: false, reason: `override needs a note of at least ${OVERRIDE_NOTE_MIN} characters` };
  return { ok: false, reason: `case is ${state}; nothing to release` };
}
