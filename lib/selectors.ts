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
