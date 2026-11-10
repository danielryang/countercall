// lib/detect/deps.ts: the real Deps for ingestEmail, on our schema (08-architecture.md section 3.7).
// Written against the driver-agnostic Q + emit (makeDeps) so the identical code runs on postgres.js in production and on PGlite in tests.
// Array parameters are passed as JSON (jsonb_array_elements_text) because the two drivers serialize JS arrays differently.
import { startCall } from '../call';
import { env, senderAllowed } from '../env';
import type { EmittedEvent, RampMode, TaskKind } from '../events';
import { applyHolds } from '../holds';
import type { HoldClient } from '../ramp.mock-db';
import { rampFor } from '../ramp-for';
import type { Q } from '../sink';
import { emit as storeEmit, q as storeQ } from '../store';
import { startVerificationCall, type CaseForCall } from '../voice/retell';
import type { AppEvent, Deps } from './ingest';
import type { NormalizedEmail, OrgConfig, Vendor } from './types';

export interface DepsIo { q: Q; emit: (e: EmittedEvent) => Promise<unknown> }
export interface DepsConfig {
  rampMode: RampMode;
  ramp: HoldClient;
  callsEnabled: boolean;
  perVendorHourLimit: number;
  allowedSenders: readonly string[];
  dial: (c: CaseForCall) => Promise<string>;
}

export async function createTaskIo(io: DepsIo, caseId: string, kind: TaskKind, title: string, reason: string): Promise<void> {
  const [t] = await io.q<{ id: string | number }>(`insert into tasks (case_id, kind, title, reason) values ($1,$2,$3,$4) returning id`, [caseId, kind, title, reason]);
  await io.emit({ type: 'task.created', caseId, taskId: Number(t.id), kind, title, reason, assignee: 'AP lead' });
}

async function loadVendors(q: Q): Promise<Vendor[]> {
  const rows = await q<Record<string, unknown>>(`
    select v.id, v.name, v.domains, v.known_contacts, v.typical_invoice_cents,
           tc.phone_e164, ba.bank_name, ba.routing_number, ba.account_last4,
           coalesce(json_agg(json_build_object('number', b.invoice_number, 'amountCents', b.amount_cents) order by b.due_date) filter (where b.id is not null), '[]') as open_invoices,
           coalesce(array_agg(b.id order by b.due_date) filter (where b.id is not null), '{}') as payment_ids
    from vendors v
    left join trusted_contacts tc on tc.vendor_id = v.id and tc.is_primary
    left join bank_accounts ba on ba.vendor_id = v.id and ba.is_default and ba.status = 'active'
    left join bills b on b.vendor_id = v.id and b.paid_at is null
    group by v.id, tc.phone_e164, ba.bank_name, ba.routing_number, ba.account_last4
    order by v.id`);
  return rows.map((r) => ({
    id: r.id as string, name: r.name as string, domains: r.domains as string[], knownContacts: r.known_contacts as string[],
    trustedPhone: (r.phone_e164 as string | null) ?? '',      // empty = no trusted number: nothing can be dialed (fail closed)
    bank: { bankName: (r.bank_name as string) ?? '', routing: ((r.routing_number as string) ?? '').trim(), accountLast4: ((r.account_last4 as string) ?? '').trim() },
    openInvoices: (typeof r.open_invoices === 'string' ? JSON.parse(r.open_invoices) : r.open_invoices as { number: string; amountCents: number }[]).map((i: { number: string; amountCents: number }) => ({ number: i.number, amountCents: Number(i.amountCents) })),
    typicalInvoiceCents: Number(r.typical_invoice_cents), scheduledPaymentIds: r.payment_ids as string[],
  }));
}

export async function makeDeps(io: DepsIo, cfg: DepsConfig, src: { provider: string; payload?: unknown } = { provider: 'agentmail' }): Promise<Deps> {
  const { q } = io;
  const [o] = await q<{ domain: string; exec_names: string[] }>(`select domain, exec_names from org`);
  const org: OrgConfig = { domain: o.domain, execNames: o.exec_names };
  const createTask = (caseId: string, kind: TaskKind, title: string, reason: string) => createTaskIo(io, caseId, kind, title, reason);

  /** Persist the case columns the UI/queue and the voice step read, alongside the event itself. */
  const persist = async (e: AppEvent): Promise<void> => {
    await io.emit(e as EmittedEvent);
    switch (e.type) {
      case 'email.received':
        await q(`update cases set email_provider_event_id = $2, email_message_id = $3, vendor_id = coalesce($4, vendor_id) where id = $1`, [e.caseId, e.email.providerEventId, e.email.messageId, e.vendorId]);
        break;
      case 'case.flagged': case 'case.cleared':
        await q(`update cases set category = $2, risk = $3 where id = $1`, [e.caseId, e.decision.category, e.decision.risk]);
        break;
      case 'call.requested':   // SERVER-ONLY columns (08 section 2.5): never echoed in events (toRow redacts)
        await q(`update cases set claimed_last4 = $2, claimed_invoices = array(select jsonb_array_elements_text($3::text::jsonb)) where id = $1`, [e.caseId, e.context.claimedAccountLast4, JSON.stringify(e.context.invoiceNumbers)]);
        break;
    }
  };

  return {
    org,
    async seen(providerEventId) {   // insert-if-absent: no row back means this exact delivery was already processed
      const r = await q(`insert into raw_webhooks (provider, event_key, signature_ok, payload) values ($1,$2,true,$3::text::jsonb) on conflict do nothing returning 1 as one`,
        [src.provider, providerEventId, JSON.stringify(src.payload ?? {})]);
      return r.length === 0;
    },
    async newCaseId() { const [r] = await q<{ id: string }>(`insert into cases (source) values ('email') returning id`); return r.id; },
    async claimCallback(caseId, vendorId, bankKey) {
      try { await q(`update cases set vendor_id = $2, bank_key = $3 where id = $1`, [caseId, vendorId, bankKey]); return true; }
      catch (err) { if ((err as { code?: string }).code === '23505') return false; throw err; }   // cases_one_open_per_bank
    },
    emit: persist,
    holdPayments: (vendorId, paymentIds, caseId) => applyHolds({ q, ramp: cfg.ramp, mode: cfg.rampMode, emit: io.emit }, caseId, vendorId, paymentIds),
    createTask,
    async startCall(caseId, vendorId, context) {   // the only dialer; refusals become human tasks inside startCall
      await startCall({ q, emit: io.emit, createTask, dial: cfg.dial, callsEnabled: cfg.callsEnabled, perVendorHourLimit: cfg.perVendorHourLimit }, caseId, vendorId, context);
    },
    canAct: (email: NormalizedEmail) => email.source === 'injector' || senderAllowed(email.from.address, cfg.allowedSenders),   // the session-gated injector bypasses the allowlist
    vendors: () => loadVendors(q),
  };
}

// ---- production wiring (postgres.js + environment) -------------------------------------------------------------------------------------------------
export async function getDeps(src: { provider: string; payload?: unknown } = { provider: 'agentmail' }): Promise<Deps> {
  const e = env();
  const ramp = rampFor(storeQ);
  return makeDeps({ q: storeQ, emit: (ev) => storeEmit(ev) }, {
    rampMode: e.RAMP_MODE, ramp, callsEnabled: e.CALLS_ENABLED, perVendorHourLimit: e.CALL_LIMIT_PER_VENDOR_HOUR,
    allowedSenders: e.INBOUND_ALLOWED_SENDERS, dial: startVerificationCall,
  }, src);
}

/** Production createTask with the original signature (used by the health reaper and scripts). */
export const createTask = (caseId: string, kind: TaskKind, title: string, reason: string) =>
  createTaskIo({ q: storeQ, emit: (ev) => storeEmit(ev) }, caseId, kind, title, reason);
