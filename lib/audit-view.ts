// lib/audit-view.ts: pure helpers for the audit screen and the footer badge. No fetching, no React: the hook (lib/use-audit.ts) and the
// components call these, and lib/audit-view.test.ts pins them down.
import type { AuditReport } from './audit';
import type { State } from './reducer';

// ---- badge ----------------------------------------------------------------------------------------------------------------------
export type BadgeKind = 'intact' | 'not_installed' | 'broken' | 'replay_mismatch' | 'unavailable';
/** What the badge shows. `null` means the check could not be fetched (network, 401, 503). The first matching rule wins (spec section E). */
export function badgeState(r: AuditReport | null): BadgeKind {
  if (!r) return 'unavailable';
  if (!r.chain.installed) return 'not_installed';
  if (!r.chain.intact) return 'broken';
  if (r.replay.mismatchCount > 0) return 'replay_mismatch';
  return 'intact';
}

// ---- polling --------------------------------------------------------------------------------------------------------------------
export const AUDIT_MIN_GAP_MS = 10_000;
/**
 * When to ask GET /api/audit/verify again. Asked on mount and whenever the event stream's lastSeq moves; never more than once per 10 s.
 * 'skip': nothing new since the last answer (or a request is already out). 'now': go. A number: wait that many ms, then go.
 */
export function nextAuditFetch(o: { now: number; lastAt: number | null; inflight: boolean; seq: number; seqAtLast: number | null }): 'skip' | 'now' | number {
  if (o.inflight) return 'skip';
  if (o.lastAt === null) return 'now';                                   // first time on this page
  if (o.seqAtLast !== null && o.seq <= o.seqAtLast) return 'skip';       // the answer we have already covers this log
  const wait = o.lastAt + AUDIT_MIN_GAP_MS - o.now;
  return wait <= 0 ? 'now' : wait;
}

// ---- events list ----------------------------------------------------------------------------------------------------------------
export type EventGroup = 'email' | 'case' | 'payment' | 'call' | 'task' | 'system';
export const EVENT_GROUPS: EventGroup[] = ['email', 'case', 'payment', 'call', 'task', 'system'];
export function groupOf(type: string): EventGroup {
  if (type.startsWith('email.')) return 'email';
  if (type.startsWith('payment.') || type === 'ramp.call') return 'payment';
  if (type.startsWith('call.')) return 'call';
  if (type.startsWith('task.')) return 'task';
  if (type.startsWith('case.')) return 'case';
  return 'system';
}

export type ActorKind = 'system' | 'detector' | 'policy' | 'voice_agent' | 'human';
export const ACTOR_KINDS: ActorKind[] = ['detector', 'policy', 'voice_agent', 'human', 'system'];
/** Stored actors are 'system' | 'detector' | 'policy' | 'voice_agent' | 'human:<name>'. Anything unexpected is shown as system, never as a person. */
export function actorKind(actor: string): ActorKind {
  if (actor.startsWith('human:')) return 'human';
  return actor === 'detector' || actor === 'policy' || actor === 'voice_agent' ? actor : 'system';
}
export const humanName = (actor: string): string | null => (actor.startsWith('human:') ? actor.slice(6) || null : null);

export interface AuditRow { seq: number; ts: string; caseId: string; type: string; actor: string; group: EventGroup; actorKind: ActorKind }
export interface AuditFilter { caseId: string | null; group: EventGroup | null; actor: ActorKind | null }
export const NO_FILTER: AuditFilter = { caseId: null, group: null, actor: null };

/** Every case event the stream holds (from the reducer's per-case timelines), newest first, filtered. */
export function auditRows(s: State, f: AuditFilter = NO_FILTER): AuditRow[] {
  const out: AuditRow[] = [];
  for (const c of Object.values(s.cases)) {
    if (f.caseId && c.id !== f.caseId) continue;
    for (const t of c.timeline) {
      const row: AuditRow = { seq: t.seq, ts: t.ts, caseId: c.id, type: t.type, actor: t.actor, group: groupOf(t.type), actorKind: actorKind(t.actor) };
      if (f.group && row.group !== f.group) continue;
      if (f.actor && row.actorKind !== f.actor) continue;
      out.push(row);
    }
  }
  return out.sort((a, b) => b.seq - a.seq);
}

/** Case ids for the filter, newest case first (the stream's own order). */
export const auditCaseIds = (s: State): string[] => s.order.filter((id) => s.cases[id]?.timeline.length);

/** The download: only the envelopes whose seq is listed (payloads are exactly what the public feed serves, already redacted by toRow()). */
export function exportDoc<E extends { seq: number }>(all: readonly E[], rows: readonly AuditRow[], meta: { source: string; filter: AuditFilter; exportedAt: string }) {
  const want = new Set(rows.map((r) => r.seq));
  const events = all.filter((e) => want.has(e.seq)).sort((a, b) => a.seq - b.seq);
  return { exportedAt: meta.exportedAt, source: meta.source, filter: meta.filter, count: events.length, events };
}
