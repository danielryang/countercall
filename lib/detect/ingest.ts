// src/ingest.ts - THE pipeline. The AgentMail webhook, the Resend fallback, the WebSocket dev script and the demo injector ALL end up here.
import { createHash } from 'node:crypto';
import { requestSummary, type HeldBill, type RampMode, type TaskKind } from '../events';
import { holdProblem, type HoldReport } from '../holds';
import { extract, type ExtractResult } from './extract';
import { decide } from './policy';
import { computeSignals, resolveVendor } from './signals';
import type { Decision, Extraction, Facts, NormalizedEmail, OrgConfig, Signal, Span, Vendor, VendorMatch } from './types';

export type AppEvent =
  | { type: 'email.received'; caseId: string; email: NormalizedEmail; signals: Signal[]; spans: Span[]; vendorId: string | null }
  | { type: 'email.classified'; caseId: string; extraction: Extraction | null; spans: Span[]; llmMs: number; error?: string }
  | { type: 'case.flagged'; caseId: string; decision: Decision; spans: Span[] }
  | { type: 'payment.held'; caseId: string; vendorId: string; paymentIds: string[]; bills?: HeldBill[]; vendorHold?: HoldReport['vendorHold']; rampMode?: RampMode }
  | { type: 'call.requested'; caseId: string; vendorId: string; phone: string; context: CallContext }
  | { type: 'case.cleared'; caseId: string; decision: Decision }
  | { type: 'task.created'; caseId: string; taskId: number; kind: TaskKind; title: string; reason: string; assignee: string };

export interface CallContext { vendorName: string; requestSummary: string; claimedAccountLast4: string | null; invoiceNumbers: string[]; emailReceivedAt: string }

export interface Deps {   // real implementation: lib/detect/deps.ts (08-architecture.md section 3.7)
  newCaseId(): Promise<string>;                                                  // CC-0100.. from a DB sequence; creates the cases row in state scanning
  seen(providerEventId: string): Promise<boolean>;                               // atomic insert-if-absent
  claimCallback(caseId: string, vendorId: string, bankKey: string): Promise<boolean>;  // false => a callback for this exact request is already open (anti call-spam)
  emit(e: AppEvent): Promise<void>;                                              // persist + push to dashboard
  holdPayments(vendorId: string, paymentIds: string[], caseId: string): Promise<HoldReport | void>; // Ramp bill + vendor hold; void in the in-memory deps
  createTask(caseId: string, kind: TaskKind, title: string, reason: string): Promise<void>;  // inserts the task AND emits task.created (the case lands on a human)
  startCall(caseId: string, vendorId: string, context: CallContext): Promise<void>;          // the only dialer seam. S2: records a task. S9: lib/call.ts
  canAct?(email: NormalizedEmail): boolean;                                      // inbound sender allowlist (PLAN s13 H4). Absent = allowed (eval, tests)
  vendors(): Promise<Vendor[]>;
  org: OrgConfig;
  extract?: (e: NormalizedEmail) => Promise<ExtractResult>;                      // injectable: live LLM, or replay of a recorded extraction
}

const matchByName = (claimed: string, vendors: Vendor[]): VendorMatch | null => {
  const c = claimed.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const v = vendors.find((v) => c.includes(v.name.toLowerCase().replace(/[^a-z0-9 ]/g, '')) || v.name.toLowerCase().startsWith(c));
  return v ? { vendor: v, via: 'llm_claimed_name' } : null;
};

export interface Analysis { vendorMatch: VendorMatch | null; signals: Signal[]; facts: Facts; ex: ExtractResult; decision: Decision; spans: Span[] }

/** Pure-ish core (only the LLM call is impure). Used by ingestEmail AND the eval runner. */
export async function analyze(email: NormalizedEmail, vendors: Vendor[], org: OrgConfig, doExtract = extract, onSignals?: (s: Signal[], spans: Span[], vm: VendorMatch | null) => Promise<void>): Promise<Analysis> {
  let vm = resolveVendor(email, vendors);
  let { signals, facts } = computeSignals(email, vm?.vendor ?? null, org);
  await onSignals?.(signals, signals.flatMap((s) => s.spans), vm);        // dashboard shows the email + rule highlights BEFORE the LLM returns
  const ex = await doExtract(email);
  if (!vm && ex.extraction?.claimed_vendor) {                              // vendor resolved only from the model's claim: allowed, but recompute signals against that vendor
    vm = matchByName(ex.extraction.claimed_vendor, vendors);
    if (vm) ({ signals, facts } = computeSignals(email, vm.vendor, org));
  }
  const decision = decide({ signals, facts, extraction: ex.extraction, vendorMatch: vm, llmEvidenceDropped: ex.evidenceDropped });
  const all = [...signals.flatMap((s) => s.spans), ...ex.spans];
  const spans = all.filter((s, i) => all.findIndex((t) => t.start === s.start && t.end === s.end && t.source === s.source) === i); // bank_details_present/_differ share spans
  return { vendorMatch: vm, signals, facts, ex, decision, spans };
}

export async function ingestEmail(email: NormalizedEmail, deps: Deps): Promise<Decision | null> {
  if (await deps.seen(email.providerEventId)) return null;               // webhooks are at-least-once
  const caseId = await deps.newCaseId();
  const a = await analyze(email, await deps.vendors(), deps.org, deps.extract ?? extract, async (signals, spans, vm) => {
    await deps.emit({ type: 'email.received', caseId, email, signals, spans, vendorId: vm?.vendor.id ?? null });
  });
  await deps.emit({ type: 'email.classified', caseId, extraction: a.ex.extraction, spans: a.ex.spans, llmMs: a.ex.ms, error: a.ex.error });
  const d = a.decision;
  if (!d.actions.length) { await deps.emit({ type: 'case.cleared', caseId, decision: d }); return d; }
  await deps.emit({ type: 'case.flagged', caseId, decision: d, spans: a.spans });

  // Public inbox: a sender that is not on INBOUND_ALLOWED_SENDERS is recorded and flagged, but may not hold payments or start a call.
  if (deps.canAct && !deps.canAct(email)) {
    await deps.createTask(caseId, 'review', 'Review flagged email', 'sender not on the inbound allowlist; recorded only, no hold and no call');
    return d;
  }

  const hold = d.actions.find((x) => x.type === 'HOLD_VENDOR_PAYMENTS');
  const call = d.actions.find((x) => x.type === 'START_CALLBACK');
  const task = d.actions.find((x) => x.type === 'CREATE_HUMAN_TASK');
  const bankKey = createHash('sha256').update(`${a.facts.routing?.value ?? ''}|${a.facts.accountLast4 ?? ''}|${a.facts.iban ?? ''}`).digest('hex').slice(0, 16);
  if (hold && hold.type === 'HOLD_VENDOR_PAYMENTS') {                      // hold is idempotent and cheap: always do it
    const report = await deps.holdPayments(hold.vendorId, hold.paymentIds, caseId);
    await deps.emit({ type: 'payment.held', caseId, vendorId: hold.vendorId, paymentIds: hold.paymentIds, ...(report ?? {}) });
    if (report && holdProblem(report, hold.paymentIds.length)) await deps.createTask(caseId, 'hold_failed', 'Ramp hold did not fully apply', 'at least one hold failed or a scheduled bill was not found; confirm the payments are blocked by hand');
  }
  if (call && call.type === 'START_CALLBACK') {
    if (await deps.claimCallback(caseId, call.vendorId, bankKey)) {
      const v = a.vendorMatch!.vendor;
      const context: CallContext = {   // everything the voice agent (01) gets. phone comes from the vendor record, never the email. The summary is built in code, never from email text.
        vendorName: v.name, requestSummary: requestSummary(email.receivedAt),
        claimedAccountLast4: a.facts.accountLast4 ?? a.ex.extraction?.new_bank?.account_last4 ?? null,
        invoiceNumbers: a.facts.invoiceNumbers.length ? a.facts.invoiceNumbers : a.ex.extraction?.invoice_numbers ?? [], emailReceivedAt: email.receivedAt };
      await deps.emit({ type: 'call.requested', caseId, vendorId: v.id, phone: call.phone, context });
      await deps.startCall(caseId, v.id, context);
    } else {
      await deps.createTask(caseId, 'review', 'Duplicate bank-change request', 'a callback for this exact request is already open; not calling again');
    }
  }
  if (task && task.type === 'CREATE_HUMAN_TASK') await deps.createTask(caseId, 'review', 'Review flagged email', task.reason);
  else if (!hold && !call) await deps.createTask(caseId, 'review', 'Review flagged email', 'flagged with no automatic action; a human decides');   // never leave a case sitting in `flagged`
  return d;
}
