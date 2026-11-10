// lib/vendors.ts: the vendor directory (read-only). Driver-agnostic (`Q`), so the route and the PGlite tests run the same query.
// Safety: phone numbers leave this module only masked (maskPhone, the same length-preserving mask toRow uses), bank accounts only as
// a masked last-4, and no secret column (cases.challenge_expected, cases.claimed_last4, routing numbers) is ever selected.
import { maskPhone, scrubPhones } from './events';
import type { Q } from './sink';

export type ContactStatus = 'trusted' | 'quarantined' | 'revoked';
export interface VendorContact {
  id: string;
  label: string;
  phoneMasked: string;
  source: string;           // contact_source enum: onboarding_w9 | contract | ramp_contact_at_import | ...
  sourceDoc: string | null;
  addedBy: string;
  addedAt: string;          // ISO
  ageDays: number;
  lastVerifiedAt: string | null;
  lastVerifiedBy: string | null;
  status: ContactStatus;
  quarantineReason: string | null;
  isPrimary: boolean;
}
export interface VendorBank { bankName: string; last4Masked: string; status: string; since: string; verifiedAt: string | null }
export interface VendorEntry {
  id: string;
  name: string;
  legalName: string | null;
  domains: string[];
  country: string;
  contacts: VendorContact[];   // primary first, then trusted, then the rest; oldest first within a group
  bank: VendorBank | null;     // the default active account on file
  casesTotal: number;          // not archived by a demo reset (seeded history included)
  casesOpen: number;           // still needs something (held, calling, needs review, ...)
  heldCents: number;           // open bills currently held by an open case
  scheduledCents: number;      // all open (unpaid) bills
}

const OPEN = `('flagged','held','calling','needs_human','awaiting_approval','fraud_blocked')`;
const iso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());
const num = (v: unknown) => Number(v ?? 0);

type VRow = { id: string; name: string; legal_name: string | null; domains: string[]; country: string; cases_total: unknown; cases_open: unknown; held_cents: unknown; scheduled_cents: unknown };
type CRow = { id: string; vendor_id: string; label: string; phone_e164: string; source: string; source_doc: string | null; added_by: string; first_seen_at: unknown; last_verified_at: unknown; last_verified_by: string | null; status: ContactStatus; quarantine_reason: string | null; is_primary: boolean; age_days: unknown };
type BRow = { vendor_id: string; bank_name: string; account_last4: string; status: string; first_seen_at: unknown; verified_at: unknown };

/** Every vendor with its numbers on file (masked, with provenance), the bank on file (masked last-4) and its case and hold totals. Sorted by open cases, then name. */
export async function listVendors(q: Q): Promise<VendorEntry[]> {
  const vendors = await q<VRow>(`
    select v.id, v.name, v.legal_name, v.domains, v.country,
      (select count(*) from cases c where c.vendor_id = v.id and c.archived_at is null) as cases_total,
      (select count(*) from cases c where c.vendor_id = v.id and c.archived_at is null and c.state in ${OPEN}) as cases_open,
      (select coalesce(sum(b.amount_cents), 0) from bills b where b.vendor_id = v.id and b.paid_at is null and exists (
         select 1 from holds h join cases c on c.id = h.case_id
         where h.bill_id = b.id and h.state in ('requested','applied','pending_ramp_approval') and c.archived_at is null and c.state in ${OPEN})) as held_cents,
      (select coalesce(sum(b.amount_cents), 0) from bills b where b.vendor_id = v.id and b.paid_at is null) as scheduled_cents
    from vendors v`);
  const contacts = await q<CRow>(`
    select t.id::text as id, t.vendor_id, t.label, t.phone_e164, t.source::text as source, t.source_doc, t.added_by, t.first_seen_at,
      t.last_verified_at, t.last_verified_by, t.status::text as status, t.quarantine_reason, t.is_primary,
      floor(extract(epoch from (now() - t.first_seen_at)) / 86400)::int as age_days
    from trusted_contacts t
    order by t.is_primary desc, (t.status = 'trusted') desc, t.first_seen_at asc`);
  const banks = await q<BRow>(`
    select vendor_id, bank_name, account_last4, status::text as status, first_seen_at, verified_at
    from bank_accounts where is_default and status = 'active'`);

  const out: VendorEntry[] = vendors.map((v) => {
    const b = banks.find((x) => x.vendor_id === v.id);
    return {
      id: v.id, name: v.name, legalName: v.legal_name, domains: [...v.domains], country: v.country,
      contacts: contacts.filter((c) => c.vendor_id === v.id).map((c) => ({
        id: c.id, label: c.label, phoneMasked: maskPhone(c.phone_e164), source: c.source, sourceDoc: c.source_doc, addedBy: c.added_by,
        addedAt: iso(c.first_seen_at)!, ageDays: num(c.age_days), lastVerifiedAt: iso(c.last_verified_at), lastVerifiedBy: c.last_verified_by,
        status: c.status, quarantineReason: c.quarantine_reason, isPrimary: c.is_primary,
      })),
      bank: b ? { bankName: b.bank_name, last4Masked: '••' + b.account_last4, status: b.status, since: iso(b.first_seen_at)!, verifiedAt: iso(b.verified_at) } : null,
      casesTotal: num(v.cases_total), casesOpen: num(v.cases_open), heldCents: num(v.held_cents), scheduledCents: num(v.scheduled_cents),
    };
  });
  out.sort((a, b) => b.casesOpen - a.casesOpen || a.name.localeCompare(b.name));
  // Defence in depth: free-text columns (source_doc, quarantine_reason, labels) are typed by people; mask any E.164 that slipped into them.
  return scrubPhones(out);
}
