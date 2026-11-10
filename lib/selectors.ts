// lib/selectors.ts: derived views over the reducer state. Pure. One place maps case states to queue groups (08 section 3.4 UI mapping).
import type { CaseState } from './events';
import type { CaseView, State } from './reducer';

export type QueueGroup = 'NEEDS ACTION' | 'IN PROGRESS' | 'RESOLVED';
export const GROUP_OF: Record<CaseState, QueueGroup> = {
  scanning: 'IN PROGRESS', calling: 'IN PROGRESS',
  flagged: 'NEEDS ACTION', held: 'NEEDS ACTION', awaiting_approval: 'NEEDS ACTION', fraud_blocked: 'NEEDS ACTION', needs_human: 'NEEDS ACTION',
  cleared: 'RESOLVED', released: 'RESOLVED', closed: 'RESOLVED',
};
export const GROUPS: QueueGroup[] = ['NEEDS ACTION', 'IN PROGRESS', 'RESOLVED'];

export const queue = (s: State): Record<QueueGroup, CaseView[]> => {
  const out: Record<QueueGroup, CaseView[]> = { 'NEEDS ACTION': [], 'IN PROGRESS': [], RESOLVED: [] };
  for (const id of s.order) { const c = s.cases[id]; out[GROUP_OF[c.state]].push(c); }
  return out;
};
/** Money currently frozen: bills of cases that are not yet released/closed/cleared. A bill leaves this total only when payment.released arrives. */
export const heldCents = (s: State): number =>
  Object.values(s.cases).filter((c) => c.payments.length && !c.release && c.state !== 'closed' && c.state !== 'cleared').reduce((n, c) => n + c.payments.reduce((m, b) => m + b.amountCents, 0), 0);
export const callingCase = (s: State): CaseView | undefined => Object.values(s.cases).find((c) => c.state === 'calling');
export const fmtCents = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- case-level derivations (pure) ----
export type Phase = 'DETECT' | 'FREEZE' | 'VERIFY' | 'DECIDE';
export const PHASES: Phase[] = ['DETECT', 'FREEZE', 'VERIFY', 'DECIDE'];
export const phasesReached = (c: CaseView): Record<Phase, boolean> => ({
  DETECT: !!c.email, FREEZE: c.payments.length > 0, VERIFY: !!c.call, DECIDE: !!c.call?.outcome || c.state === 'cleared',
});
export const mmss = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
/** Email -> outcome, from the events' own timestamps. Freezes at call.outcome, which is what makes the "in minutes" claim honest. */
export const elapsedMs = (c: CaseView) => Date.parse(c.call?.outcome?.at ?? c.updatedAt) - Date.parse(c.timeline[0]?.ts ?? c.createdAt);
/** Still working on its own (reading, holding, calling): the only states in which the case clock keeps running. Every other state waits on a person or is done. */
export const clockRunning = (c: CaseView) => !c.call?.outcome && (c.state === 'scanning' || c.state === 'flagged' || c.state === 'held' || c.state === 'calling');
/** The case clock. With `nowMs` (live view only) it ticks while the case is still running; it freezes at call.outcome. Replays pass no `nowMs`: their
 *  timestamps are not wall-clock time, so the clock follows the events. Never runs backwards past the last event (clock skew). */
export const elapsedAt = (c: CaseView, nowMs?: number) => {
  const base = elapsedMs(c);
  if (nowMs === undefined || !clockRunning(c)) return base;
  return Math.max(base, nowMs - Date.parse(c.timeline[0]?.ts ?? c.createdAt));
};
export const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
