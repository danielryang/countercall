// lib/reducer.ts: THE UI state function. Pure and immutable. The same code path serves live polling, snapshot catch-up, recorded-run replay,
// /dev/states and the screenshot loop. It consumes the canonical envelope (lib/events.ts) and nothing else.
// Rules: case status comes ONLY from `case.state` events (never re-derived); money is never optimistic; unknown types advance lastSeq and are otherwise ignored;
// applying the same event twice is a no-op (idempotent on seq).
import type { CaseState, EmittedEvent, HeldBill } from './events';
import type { Envelope } from './runs';
import type { Decision as DetectDecision, Extraction, Signal, Span } from './detect/types';
import type { Decision as CallDecision } from './voice/decide';
import type { CallContact, TranscriptItem } from './voice/events';

type P<K extends EmittedEvent['type']> = Omit<Extract<EmittedEvent, { type: K }>, 'type' | 'caseId' | 'at'>;
export type Ev = Envelope;

export type CallStatus = 'dialing' | 'connected' | 'ended' | 'failed';
export interface CallView {
  id: string; mode: 'phone' | 'web' | 'replay'; contact?: CallContact; status: CallStatus; startedAt: string; connectedAt?: string; endedAt?: string; disconnectionReason?: string;
  turns: TranscriptItem[]; transcriptFinal: boolean;
  tools: { name: 'report_answer' | 'report_challenge' | 'report_flag'; args: Record<string, unknown>; seq: number }[];
  recording?: { monoUrl?: string; stereoUrl?: string };
  outcome?: { decision: CallDecision; summary?: string; at: string };
}
export interface TaskView { id: number; kind: string; title: string; reason: string; assignee: string; status: 'open' | 'resolved'; resolution?: string; createdAt: string }
export interface TimelineItem { seq: number; ts: string; type: string; actor: string }
export interface CaseView {
  id: string; state: CaseState; createdAt: string; updatedAt: string; lastSeq: number;
  vendorId: string | null; vendorName: string | null;
  email?: { from: { name?: string; address: string }; subject: string; body: string; receivedAt: string; source: string; replyTo: { name?: string; address: string }[] };
  signals: Signal[]; spans: Span[]; extraction: Extraction | null; llmMs?: number; decision?: DetectDecision;
  payments: HeldBill[]; vendorHold?: string; rampMode?: string; rampCalls: { method: string; path: string; status: number; ms: number; seq: number }[];
  trusted?: { phoneMasked: string };
  call: CallView | null;
  tasks: TaskView[];
  release?: { approvedBy: string; note: string | null; destination: string; at: string; paymentIds: string[] };
  closed?: { by: string; note: string; at: string };
  timeline: TimelineItem[];
}
export interface State { cases: Record<string, CaseView>; order: string[]; lastSeq: number }
export const initial: State = { cases: {}, order: [], lastSeq: 0 };

const blank = (id: string, ts: string): CaseView => ({
  id, state: 'scanning', createdAt: ts, updatedAt: ts, lastSeq: 0, vendorId: null, vendorName: null, signals: [], spans: [], extraction: null, payments: [], rampCalls: [], call: null, tasks: [], timeline: [],
});
const blankCall = (id: string, ts: string): CallView => ({ id, mode: 'phone', status: 'dialing', startedAt: ts, turns: [], transcriptFinal: false, tools: [] });
const caseNumber = (id: string) => Number(id.replace(/\D/g, '')) || 0;
/** The call an event applies to, or null when it belongs to a DIFFERENT (older) call: late events from a previous attempt must never overwrite the current one.
 *  A new attempt starts only with call.created. With no call yet (a snapshot that begins mid-case) we adopt the event's call. */
const callFor = (c: CaseView, callId: string, ts: string): CallView | null => (!c.call ? blankCall(callId, ts) : c.call.id === callId ? c.call : null);
const mergeSpans = (a: Span[], b: Span[]): Span[] => [...a, ...b].filter((s, i, all) => all.findIndex((t) => t.start === s.start && t.end === s.end && t.source === s.source) === i);

function reduceCase(c: CaseView, e: Ev): CaseView {
  const ts = e.ts;
  switch (e.type) {
    case 'email.received': { const p = e.payload as unknown as P<'email.received'>;
      return { ...c, vendorId: p.vendorId, vendorName: p.vendorName ?? c.vendorName, signals: p.signals, spans: mergeSpans(c.spans, p.spans),
        email: { from: p.email.from, subject: p.email.subject, body: p.email.body, receivedAt: p.email.receivedAt, source: p.email.source, replyTo: p.email.replyTo } }; }
    case 'email.classified': { const p = e.payload as unknown as P<'email.classified'>;
      return { ...c, extraction: p.extraction, llmMs: p.llmMs, spans: mergeSpans(c.spans, p.spans) }; }
    case 'case.flagged': { const p = e.payload as unknown as P<'case.flagged'>; return { ...c, decision: p.decision, spans: mergeSpans(c.spans, p.spans) }; }
    case 'case.cleared': { const p = e.payload as unknown as P<'case.cleared'>; return { ...c, decision: p.decision }; }
    case 'case.state': { const p = e.payload as unknown as P<'case.state'>; return { ...c, state: p.to }; }          // the ONLY writer of `state`
    case 'ramp.call': { const p = e.payload as unknown as P<'ramp.call'>; return { ...c, rampCalls: [...c.rampCalls, { method: p.method, path: p.path, status: p.status, ms: p.ms, seq: e.seq }] }; }
    case 'payment.held': { const p = e.payload as unknown as P<'payment.held'>;
      return { ...c, payments: p.bills ?? c.payments, vendorHold: p.vendorHold ?? c.vendorHold, rampMode: p.rampMode ?? c.rampMode }; }
    case 'call.requested': { const p = e.payload as unknown as { phoneMasked: string }; return { ...c, trusted: { phoneMasked: p.phoneMasked } }; }
    case 'call.created': { const p = e.payload as unknown as P<'call.created'>; return { ...c, call: { ...blankCall(p.callId, ts), mode: p.mode, contact: p.contact } }; }
    case 'call.status': { const p = e.payload as unknown as P<'call.status'>; const call = callFor(c, p.callId, ts); if (!call) return c;
      return { ...c, call: { ...call, status: p.status, disconnectionReason: p.disconnectionReason ?? call.disconnectionReason,
        connectedAt: p.status === 'connected' ? ts : call.connectedAt, endedAt: p.status === 'ended' || p.status === 'failed' ? ts : call.endedAt } }; }
    case 'call.transcript.delta': { const p = e.payload as unknown as P<'call.transcript.delta'>; const call = callFor(c, p.callId, ts); if (!call) return c;
      if (call.transcriptFinal && !p.final) return c;                                       // a live update that lands after the final one never replaces it
      return { ...c, call: { ...call, turns: p.items, transcriptFinal: p.final } }; }            // Retell re-sends the whole transcript: replace, never append
    case 'call.tool': { const p = e.payload as unknown as P<'call.tool'>; const call = callFor(c, p.callId, ts); if (!call) return c;
      return { ...c, call: { ...call, tools: [...call.tools, { name: p.name, args: p.args, seq: e.seq }] } }; }
    case 'call.recording': { const p = e.payload as unknown as P<'call.recording'>; const call = callFor(c, p.callId, ts); if (!call) return c;
      return { ...c, call: { ...call, recording: { monoUrl: p.monoUrl, stereoUrl: p.stereoUrl } } }; }
    case 'call.outcome': { const p = e.payload as unknown as P<'call.outcome'>; const call = callFor(c, p.callId, ts); if (!call) return c;
      return { ...c, call: { ...call, outcome: { decision: p.decision, summary: p.summary, at: ts } } }; }
    case 'task.created': { const p = e.payload as unknown as P<'task.created'>;
      return { ...c, tasks: [...c.tasks, { id: p.taskId, kind: p.kind, title: p.title, reason: p.reason, assignee: p.assignee, status: 'open', createdAt: ts }] }; }
    case 'task.resolved': { const p = e.payload as unknown as P<'task.resolved'>;
      return { ...c, tasks: c.tasks.map((t) => (t.id === p.taskId ? { ...t, status: 'resolved' as const, resolution: p.resolution } : t)) }; }
    case 'payment.released': { const p = e.payload as unknown as P<'payment.released'>;      // payments flip only on this event: money is never optimistic
      return { ...c, release: { approvedBy: p.approvedBy, note: p.note, destination: p.destination, at: ts, paymentIds: p.paymentIds } }; }
    case 'case.closed': { const p = e.payload as unknown as P<'case.closed'>; return { ...c, closed: { by: p.closedBy, note: p.note, at: ts } }; }
    default: return c;                                                                       // payment.release_failed, unknown types: information only
  }
}

export function apply(s: State, e: Ev): State {
  if (e.type === 'system.reset') {
    const keep = (e.payload as unknown as P<'system.reset'>).keepThrough;
    const cases = Object.fromEntries(Object.entries(s.cases).filter(([id]) => caseNumber(id) <= keep));
    return { cases, order: s.order.filter((id) => id in cases), lastSeq: Math.max(s.lastSeq, e.seq) };   // keep the seq so late pre-reset events stay ignored
  }
  if (e.seq <= s.lastSeq) return s;                                                          // duplicate / replayed after a snapshot: idempotent
  if (!e.case_id) return { ...s, lastSeq: e.seq };
  const existing = s.cases[e.case_id];
  const base = existing ?? blank(e.case_id, e.ts);
  const next = reduceCase(base, e);
  const view: CaseView = { ...next, lastSeq: e.seq, updatedAt: e.ts, timeline: [...next.timeline, { seq: e.seq, ts: e.ts, type: e.type, actor: e.actor }] };
  return { cases: { ...s.cases, [e.case_id]: view }, order: existing ? s.order : [e.case_id, ...s.order], lastSeq: e.seq };
}

export const reduce = (events: readonly Ev[], from: State = initial): State => events.reduce(apply, from);
