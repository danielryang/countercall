// lib/detect/deps.ts: the real Deps for ingestEmail, on our schema (08-architecture.md section 3.7). Replaces the in-memory stub.
// Built per request (cheap) because `seen()` needs the provider and raw payload of THIS webhook. No clients are constructed at module scope.
import { startCall } from '../call';
import { env, senderAllowed } from '../env';
import type { EmittedEvent, TaskKind } from '../events';
import { applyHolds } from '../holds';
import { makeRamp, type MockSeed } from '../ramp';
import { DbMockRampClient, type HoldClient } from '../ramp.mock-db';
import { emit as storeEmit, sql } from '../store';
import type { Q } from '../sink';
import { startVerificationCall } from '../voice/retell';
import type { AppEvent, Deps } from './ingest';
import type { NormalizedEmail, OrgConfig, Vendor } from './types';

const q: Q = (text, params = []) => sql.unsafe(text, params as never) as never;
const EMPTY_SEED: MockSeed = { vendors: [], accounts: {}, contacts: {}, bills: [] };

function rampClient(): HoldClient {
  if (env().RAMP_MODE === 'sandbox') return makeRamp({ ...process.env, RAMP_MODE: 'sandbox' }, EMPTY_SEED);   // throws without credentials: fail closed
  return new DbMockRampClient(q);
}

let orgCache: OrgConfig | undefined;
async function loadOrg(): Promise<OrgConfig> {
  if (orgCache) return orgCache;
  const [o] = await sql`select domain, exec_names from org`;
  return (orgCache = { domain: o.domain as string, execNames: o.exec_names as string[] });
}

async function loadVendors(): Promise<Vendor[]> {
  const rows = await sql`
    select v.id, v.name, v.domains, v.known_contacts, v.typical_invoice_cents,
           tc.phone_e164, ba.bank_name, ba.routing_number, ba.account_last4,
           coalesce(json_agg(json_build_object('number', b.invoice_number, 'amountCents', b.amount_cents) order by b.due_date) filter (where b.id is not null), '[]') as open_invoices,
           coalesce(array_agg(b.id order by b.due_date) filter (where b.id is not null), '{}') as payment_ids
    from vendors v
    left join trusted_contacts tc on tc.vendor_id = v.id and tc.is_primary
    left join bank_accounts ba on ba.vendor_id = v.id and ba.is_default and ba.status = 'active'
    left join bills b on b.vendor_id = v.id and b.paid_at is null
    group by v.id, tc.phone_e164, ba.bank_name, ba.routing_number, ba.account_last4
    order by v.id`;
  return rows.map((r) => ({
    id: r.id as string, name: r.name as string, domains: r.domains as string[], knownContacts: r.known_contacts as string[],
    trustedPhone: (r.phone_e164 as string | null) ?? '',      // empty = no trusted number: nothing can be dialed (fail closed)
    bank: { bankName: (r.bank_name as string) ?? '', routing: ((r.routing_number as string) ?? '').trim(), accountLast4: ((r.account_last4 as string) ?? '').trim() },
    openInvoices: (r.open_invoices as { number: string; amountCents: number }[]).map((i) => ({ number: i.number, amountCents: Number(i.amountCents) })),
    typicalInvoiceCents: Number(r.typical_invoice_cents), scheduledPaymentIds: r.payment_ids as string[],
  }));
}

/** Persist the case columns the UI/queue and the later voice step read, alongside the event itself. */
async function persist(e: AppEvent): Promise<void> {
  await storeEmit(e as EmittedEvent);
  switch (e.type) {
    case 'email.received':
      await sql`update cases set email_provider_event_id = ${e.email.providerEventId}, email_message_id = ${e.email.messageId}, vendor_id = coalesce(${e.vendorId}, vendor_id) where id = ${e.caseId}`;
      break;
    case 'case.flagged': case 'case.cleared':
      await sql`update cases set category = ${e.decision.category}, risk = ${e.decision.risk} where id = ${e.caseId}`;
      break;
    case 'call.requested':   // SERVER-ONLY column (08 section 2.5): never echoed in events (toRow redacts)
      await sql`update cases set claimed_last4 = ${e.context.claimedAccountLast4}, claimed_invoices = ${e.context.invoiceNumbers} where id = ${e.caseId}`;
      break;
  }
}

export async function createTask(caseId: string, kind: TaskKind, title: string, reason: string): Promise<void> {
  const [t] = await sql`insert into tasks (case_id, kind, title, reason) values (${caseId}, ${kind}, ${title}, ${reason}) returning id`;
  await storeEmit({ type: 'task.created', caseId, taskId: Number(t.id), kind, title, reason, assignee: 'AP lead' });
}

export async function getDeps(src: { provider: string; payload?: unknown } = { provider: 'agentmail' }): Promise<Deps> {
  const org = await loadOrg();
  return {
    org,
    async seen(providerEventId) {   // insert-if-absent: no row back means this exact delivery was already processed
      const r = await sql`insert into raw_webhooks (provider, event_key, signature_ok, payload) values (${src.provider}, ${providerEventId}, true, ${sql.json((src.payload ?? {}) as never)}) on conflict do nothing returning 1 as one`;
      return r.length === 0;
    },
    async newCaseId() { const [r] = await sql`insert into cases (source) values ('email') returning id`; return r.id as string; },
    async claimCallback(caseId, vendorId, bankKey) {
      try { await sql`update cases set vendor_id = ${vendorId}, bank_key = ${bankKey} where id = ${caseId}`; return true; }
      catch (err) { if ((err as { code?: string }).code === '23505') return false; throw err; }   // cases_one_open_per_bank
    },
    emit: persist,
    holdPayments: (vendorId, paymentIds, caseId) => applyHolds({ q, ramp: rampClient(), mode: env().RAMP_MODE, emit: (e) => storeEmit(e) }, caseId, vendorId, paymentIds),
    createTask,
    startCall: async (caseId, vendorId, context) => {   // the only dialer; refusals become human tasks inside startCall
      await startCall({ q, emit: (e) => storeEmit(e), createTask, dial: startVerificationCall, callsEnabled: env().CALLS_ENABLED, perVendorHourLimit: env().CALL_LIMIT_PER_VENDOR_HOUR }, caseId, vendorId, context);
    },
    canAct: (email: NormalizedEmail) => email.source === 'injector' || senderAllowed(email.from.address, env().INBOUND_ALLOWED_SENDERS),   // the session-gated injector bypasses the allowlist
    vendors: loadVendors,
  };
}
