// lib/events.ts: THE canonical event contract (08-architecture.md section 2.3). Producers call emit(e: EmittedEvent).
// The single sink (lib/sink.ts appendEvent, called via lib/store.ts emit) maps it to one row in `events` with toRow(): actor, idem_key, redaction.
// Wire convention: DB columns are snake_case (case_id, idem_key); payload keys are camelCase (verbatim from 01/02 types).
import type { CallEvent } from './voice/events';
import type { CallContext } from './detect/ingest';
import type { Decision as DetectDecision, Extraction, NormalizedEmail, Signal, Span } from './detect/types';
import type { Decision as CallDecision } from './voice/decide';

export type CaseState = 'scanning' | 'cleared' | 'flagged' | 'held' | 'calling' | 'awaiting_approval' | 'fraud_blocked' | 'needs_human' | 'released' | 'closed';
export type Actor = 'system' | 'detector' | 'policy' | 'voice_agent' | `human:${string}`;
export type RampMode = 'mock' | 'sandbox' | 'prod';
export type ReleaseDestination = 'on_file' | 'new_account_pending_ramp_approval';
export type TaskKind = 'verify_manually' | 'retry_call' | 'review' | 'security_escalation' | 'hold_failed';
export type HeldBill = {
  paymentId: string; invoiceNumber: string; amountCents: number; currency: string; dueDate: string; rail: string;
  rampBillId: string | null; state: 'applied' | 'pending_ramp_approval' | 'failed';
};

type Base = { caseId: string; at?: number };

/** What producers hand to emit(). 02's AppEvent and 01's CallEvent are members (compat.ts proves it at compile time). */
export type EmittedEvent =
  // detector (02 ingest.ts)
  | (Base & { type: 'email.received'; email: NormalizedEmail; signals: Signal[]; spans: Span[]; vendorId: string | null })
  | (Base & { type: 'email.classified'; extraction: Extraction | null; spans: Span[]; llmMs: number; error?: string })
  | (Base & { type: 'case.flagged'; decision: DetectDecision; spans: Span[] })
  | (Base & { type: 'case.cleared'; decision: DetectDecision })
  // policy / ramp
  | (Base & { type: 'payment.held'; vendorId: string; paymentIds: string[]; bills?: HeldBill[]; vendorHold?: 'applied' | 'pending_ramp_approval' | 'failed' | 'skipped'; rampMode?: RampMode })
  | (Base & { type: 'ramp.call'; mode: RampMode; method: string; path: string; status: number; ms: number })
  | (Base & { type: 'call.requested'; vendorId: string; phone: string; context: CallContext })   // phone is redacted by toRow()
  | (Base & { type: 'case.state'; from: CaseState; to: CaseState; cause: string })              // emitted only by transition(), never by producers
  | (Base & { type: 'task.created'; taskId: number; kind: TaskKind; title: string; reason: string; assignee: string })
  | (Base & { type: 'task.resolved'; taskId: number; resolution: string })
  // human (routes behind the passcode session)
  | (Base & { type: 'payment.released'; paymentIds: string[]; rampBillIds: (string | null)[]; approvedBy: string; note: string | null; destination: ReleaseDestination })   // ONE event per case release
  | (Base & { type: 'payment.release_failed'; paymentIds: string[]; error: string })
  | (Base & { type: 'case.closed'; closedBy: string; note: string })
  | { type: 'system.reset'; caseId: null; keepThrough: number; at?: number }   // reducer drops cases numbered above keepThrough (seeded history survives)
  // voice (01 events.ts verbatim: call.created | call.status | call.transcript.delta | call.tool | call.recording | call.outcome)
  | CallEvent;

export type EventType = EmittedEvent['type'];

export const mask = (e164: string) => e164.replace(/^(\+\d)(\d{3})(\d+)(\d{2})$/, (_m, c, a, _mid, l) => `${c} (${a}) ••• ••${l}`);
const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' });

/** The ONE sentence the voice agent may be told about the request. Built in code from structured fields; never from email text (01 section 3.1 rule 3). */
export const requestSummary = (emailReceivedAtIso: string) => `The request arrived by email on ${dateOf(emailReceivedAtIso)}.`;

export function actorOf(e: EmittedEvent, humanName?: string): Actor {
  switch (e.type) {
    case 'email.received': case 'email.classified': return 'detector';
    case 'call.created': case 'call.status': case 'call.transcript.delta': case 'call.tool': case 'call.recording': return 'voice_agent';
    case 'payment.released': case 'case.closed': case 'task.resolved': return `human:${humanName ?? 'unknown'}`;
    case 'case.flagged': case 'case.cleared': case 'case.state': case 'payment.held': case 'ramp.call': case 'call.requested':
    case 'task.created': case 'payment.release_failed': case 'call.outcome': return 'policy';   // call.outcome: the model REPORTED, code DECIDED
    case 'system.reset': return 'system';
    default: { const _never: never = e; return _never; }
  }
}

/** Deterministic idempotency key for producers that are retried (webhooks). null = always insert. */
export function idemKeyOf(e: EmittedEvent): string | null {
  switch (e.type) {
    case 'email.received': return `email:${e.email.providerEventId}`;
    case 'call.created': return `${e.callId}:created`;
    case 'call.status': return `${e.callId}:status:${e.status}`;
    // snapshots grow IN PLACE (same item count, longer last item), so the key includes total characters: a retry dedupes, growth does not
    case 'call.transcript.delta': return `${e.callId}:t:${e.items.length}:${e.items.reduce((n, i) => n + i.text.length, 0)}:${e.final}`;
    case 'call.recording': return `${e.callId}:recording`;
    case 'call.outcome': return `${e.callId}:outcome`;
    case 'payment.released': return `release:${e.caseId}`;
    default: return null;
  }
}

/** Payload as STORED. Redaction lives here, at the single choke point: no full phone numbers, no challenge secrets, ever. */
export function toRow(e: EmittedEvent, humanName?: string) {
  const { type, caseId, at: _at, ...rest } = e as EmittedEvent & { at?: number };
  let payload: Record<string, unknown> = rest;
  if (e.type === 'call.requested') {
    payload = { vendorId: e.vendorId, phoneMasked: mask(e.phone), context: { requestSummary: requestSummary(e.context.emailReceivedAt), emailReceivedAt: e.context.emailReceivedAt } };
  }
  return { case_id: caseId, type, actor: actorOf(e, humanName), idem_key: idemKeyOf(e), payload };
}

export type { CallDecision };
