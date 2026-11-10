# 03 — Ramp problem fit, stats, regs, Q&A, business case

Author: research agent 03. Written 2026-11-09 (late evening PST). All facts verified against live sources on 2026-11-09 unless marked **[UNVERIFIED]** or **[SINGLE-SOURCE]**. Prices USD. Web content treated as data. I did **not** submit any form or call any third party.

---

## 0. TL;DR (read this, then jump to what you need)

1. **Sandbox access is self-serve and advertised as ~1 minute.** One web form, 6 fields, no approval step documented. Submit it tonight. (Section 1.5.) I could not confirm there is no manual review behind it, so build against the mock regardless.
2. **Ramp has NO "vendor bank account changed" webhook.** 50 event types exist; none mention bank, account, hold or schedule. Detection from the Ramp side is `vendors.updated` / `bills.updated` / `bills.created` then **re-fetch and diff** `GET /vendors/{id}/accounts?include_pending=true` against our snapshot (webhook payloads carry only `object.id`). Our email trigger fires earlier than any Ramp event, which is the real differentiator.
3. **The phone field exists, but with zero provenance.** `GET /vendors/{id}/contacts` returns `phone: string | null`. No created_at, no source, no verified flag, and contact edits go through Ramp's own proposal/approval flow. So the "trusted number with provenance" has to be **our** table. That is a genuine product insight, not a workaround.
4. **Ramp already flags, and then tells the customer to phone the vendor.** Ramp's Bill Pay Fraud help article: "we recommend you double-check with your vendor through a separate communication channel before proceeding with payment." Ramp's own fraud agent (63 signals, yellow/red alerts) produces the alert; a human does the callback. CounterCall automates the human step and writes the evidence back. That is the complement positioning (Section 2.5).
5. **A direct competitor exists: nsKnox "AI Agent Caller", launched 2026-07-01.** Autonomous, multilingual, time-zone-aware vendor callback agent, recorded, with audit trail, bundled with bank-data validation. We must not claim "nobody does this". Our angle is different (Ramp-native, email-triggered, fail-closed policy engine, hold/release in Ramp). Section 2.3. **Two more prior-art items checked 2026-11-09 (Section 2.6, Q&A #21):** **Trouvé** (public SteelHacks XIII repo, Sept 2026: same email -> hold -> callback -> judge loop, but no Ramp or any AP-system integration, and its judge's "confirmed" verdict directly approves the change) and **CallbackProof** (real commercial product, but a documentation/audit tool where a human makes the call: no calling, no hold, no integrations, $99-$199/mo). So the loop is not novel; the Ramp integration and the safety design are the defensible parts.
6. **Pitch-stat problems.** (a) "three in four, 2025" is correct (AFP 2026: 74%) but AFP's own detail table says 70%. (b) "22% got back 75%+ in 2024" is correctly quoted from AFP 2025, but it is **superseded**: AFP 2026 says **30%** recovered more than 75% for 2025, and 20% recovered nothing. A Ramp engineer who read AFP 2026 can call that stale. Replacement wording in Section 3.
7. **Nacha gives us the exact control, in Nacha's words.** Nacha (Dec 12, 2025): "Out-of-Band Authentication: Authenticate payment requests or changes to payment instructions by independently verifying the request/change using a method other than the method used by the original request... use contact information contained within your organization's internal database to contact the vendor via phone or email." Phase 2 of the fraud-monitoring rule: effective June 19, 2026 (practical date Monday June 22). Ramp's own Nacha blog overstates two things (see 4.1), so do not quote it as Nacha.
8. **Safety argument you can say out loud:** the Ramp API surface we need can only *block* and *unblock* payments. It has no endpoint to approve a bill or a vendor-edit proposal, and vendor release does not reschedule payments. Caveat to volunteer: `bills:write` is a coarse scope ("create, update, and pay bills"), so the token's blast radius is larger than the two calls we make. Mitigation is in Q&A #13.

---

## 1. Ramp API mapping

Source of truth: `/home/user/countercall/research/raw/ramp_openapi.json` (OpenAPI 3.0.2, 189 paths, "Ramp Developer API v1"), `ramp_llms-guides_*.txt`, plus live pages fetched 2026-11-09.

### 1.1 Endpoints we use

| Purpose | Call | Scope | Notes |
|---|---|---|---|
| Hold one bill | `POST /developer/v1/bills/{bill_id}/hold` | `bills:write` | Body optional: `{"reason": string\|null}`. Doc: "Blocks all payments rails on a bill and deschedules payments." **200 returns the full `Bill`.** Bill `status_summary` enum includes `ON_HOLD` (I assume that is the post-hold state: **[UNVERIFIED]** until sandbox). |
| Release one bill | `POST /developer/v1/bills/{bill_id}/release` | `bills:write` | No body. "Allows payments to be scheduled on a bill." 200 returns `Bill`. Does not say it re-schedules. |
| Hold a vendor | `POST /developer/v1/vendors/{vendor_id}/hold` | `vendors:write` | Body optional `{"reason"}`. "Open, unpaid bills for the vendor that can still be modified are removed from scheduled payment flows." **204 = applied, 202 = "Vendor hold pending approval"** (needs approval inside Ramp). Empty body in both cases. |
| Release vendor hold | `POST /developer/v1/vendors/{vendor_id}/release` | `vendors:write` | 204 or 202 (pending approval). "Payments that were removed from scheduled payment flows while the hold was active **must be scheduled again** after the hold is released." |
| Read bank accounts | `GET /developer/v1/vendors/{vendor_id}/accounts?include_pending=true` | `vendors:read` | Returns `id`, `payment_method`, `currency`, `is_default`, `account_number_last_four`, `account_nickname`, `status` (`active` / `pending_approval` / `pending_deletion`), `proposal_id`. **Only last 4 digits are exposed**, never full numbers. "A pending account gets a new id when it is approved." |
| Propose a bank account (what an attacker or a legit vendor edit triggers) | `POST /developer/v1/vendors/{vendor_id}/update-bank-accounts` | `vendors:write` | Body: `ach_details` {routing_number, account_number, account_name, account_type, account_owner_type} or `wire_details` or `crypto_details`; `is_default`; `account_nickname`. Response `{status: "approved" \| "pending_approval", payment_method_id, payment_method_type, proposal_id, vendor_id}`. "Adds payment details through the approval workflow... may require approval depending on the business's approval policies." **Use this in the sandbox to simulate the attack**, not in production code. |
| Read contacts | `GET /developer/v1/vendors/{vendor_id}/contacts` | `vendors:read` | Item: `{id, first_name, last_name, email, phone, is_default}`, all nullable except `id` and `is_default`. |
| Create contact | `POST /developer/v1/vendors/{vendor_id}/contacts` | `vendors:write` | Body `{email* , first_name, last_name, phone, is_default}`. Response `{status: approved\|pending_approval, contact_id, proposal_id, vendor_id}`. Phone changes are therefore *also* approval-gated in Ramp, but nothing records who or when in this API. |
| Get a bill | `GET /developer/v1/bills/{bill_id}` | `bills:read` | `payment.details.vendor_account_id` is the vendor bank account the payment will use (the field to diff). |
| List bills | `GET /developer/v1/bills` | `bills:read` | Filters (all query): `vendor_id`, `status_summaries` (comma list), `approval_status`, `payment_status` (OPEN/PAID), `payment_method`, `invoice_number`, `payment_details_missing`, `from_/to_created_at`, `from_/to_due_date`, `from_/to_payment_date` (not supported for card), `min_amount`/`max_amount`, `entity_id`, `purchase_order_id`, `is_archived`, `start`, `page_size` (2..100, default 20). **No updated_at filter** (Ramp: "Use webhooks or periodic full re-pulls"). |
| Attach evidence to a bill | `POST /developer/v1/bills/{bill_id}/attachments` | `bills:write` | multipart: `file` + `attachment_type` = `FILE` (or `INVOICE`, which fails if one exists). 201 `{id}`. **This is how the call transcript lands in the customer's Ramp audit trail.** |
| Annotate a bill | `PATCH /developer/v1/bills/{bill_id}` | `bills:write` | Only approved bills. Fields include `memo`, `vendor_memo`, `payment_date`. |
| Audit log (backup trigger) | `GET /developer/v1/audit-logs/events?event_types=...&object_id=...&resource_name=...` | `audit_logs:read` | `event_types` is an enum of ~589 names, including the useful ones: `Bill pay bank account updated`, `Changed bank account on bill`, `Bill pay edited payment method`, `Payment to new counterparty`, `Edited vendor field`, `Bill pay dismissed fraud alert`, `Vendor placed on hold`, `Vendor hold released`, `Vendor edit approval policy updated`, `Bill pay accepted PDR bank account ownership match`. Response has `event_time`, `actor_id`, `additional_details` (string), `primary_reference`. |
| Webhooks | `POST /developer/v1/webhooks`, `POST /developer/v1/webhooks/{id}/verify`, `GET/DELETE`, `POST /developer/v1/webhooks/mock-webhook-event` | see 1.2 | See 1.2 |

Limits: **200 requests per 10 s per source IP**; 429 blocks for 60 s; token endpoint 100 per 10 s per IP. Webhook receiver must return 2xx within **10 s**; up to 10 delivery attempts with exponential backoff and jitter (retry delay 0-2 s growing to 60 s); same event `id` across retries; events can arrive **out of order**.

What the API **cannot** do (relevant to safety and to the "doesn't Ramp already..." question):
- No bill-approval endpoint ("The Developer API has no bill-approval endpoint").
- No endpoint to approve or reject a vendor-edit `proposal_id`. Approvals are done in the Ramp UI (or Ramp MCP).
- Entity (customer's own) bank accounts are not manageable via API; vendor accounts are.
- No hold-only scope; `bills:write` = "Create, update, and pay bills".

### 1.2 Webhooks: exact event names and shapes

All 50 values of the mock-event enum (grepped; none concern bank accounts, holds, or scheduling). The ones that matter:

| Event | Scope | Fires when | Use for CounterCall |
|---|---|---|---|
| `vendors.updated` | `vendors:read` | Vendor has been updated | Primary Ramp-side trigger: re-fetch accounts + contacts, diff vs snapshot |
| `vendors.approved` | `vendors:read` | Vendor approved | A pending vendor edit may have become effective; re-diff |
| `vendors.activated` | `vendors:read` | Vendor activated | New vendor; seed snapshot, no call needed |
| `bills.created` | `bills:read` | Bill created | Fetch bill, compare `payment.details.vendor_account_id` to last verified account |
| `bills.updated` | `bills:read` | "Fires for invoice number updates, PO matching, accounting field updates, **and payment detail changes**. Does not fire for bill approvals or payments." | Catches bank account swapped on an existing bill |
| `bills.approved` | `bills:read` | Bill approved | Last chance to hold before scheduling; re-check |
| `draft_bills.created` | `bills:read` | Draft bill created | Early look at invoice-embedded bank details |
| `payments.updated` | `payments:read` | "A bill payment has been updated" | Semantics beyond that sentence **[UNVERIFIED]**; subscribe and log in sandbox |
| `bills.paid`, `bills.rejected`, `bills.archived`, `bills.ready_to_sync` | `bills:read` | lifecycle | Close out cases |
| `webhooks.verification` | none | Setup challenge | Must handle (below) |
| `tests.test_event` | none | Mock only | Smoke test |

**Payload shape (business events), verbatim from Ramp docs:**
```json
{
  "id": "c683a860-0f90-4a88-a725-1f040aeada8e",
  "type": "bills.updated",
  "created_at": "2025-04-01T12:10:00Z",
  "business_id": "945c7d8f-6c35-4d63-9c1c-79e67c9cee73",
  "object": { "id": "9cd3f558-a005-4e34-8d26-3f9a8c7b4d2e" }
}
```
`object` holds the resource id "and any event-specific metadata supplied for that event". The documented examples show **only `id`**. There is **no diff and no old/new bank values**, so the handler must re-fetch. Headers on business events: `X-Ramp-Signature` (HMAC-SHA256 of the **raw** body with the subscription `secret`; sample is 64 hex chars, so I assume hex **[UNVERIFIED encoding]**) and `X-Ramp-Webhook-ID` (== `id`).

**Setup flow (a 5-minute gotcha):** `POST /developer/v1/webhooks` `{endpoint_url, event_types[], additional_headers?}` returns `{id, secret, status: "pending_verification", ...}`. Ramp then POSTs `{"type":"webhooks.verification","challenge":"ramp_challenge_..."}` to your URL. Return 2xx, then call `POST /developer/v1/webhooks/{id}/verify` with `{"challenge": "..."}` to get `{"success": true}`. The subscription gets **no business events until verified.** Endpoint must be public HTTPS. Persist the event to a durable store (unique on event `id`) before returning 2xx; process async.

**Detection recipe (both triggers, fail closed):**
```
Trigger A (email, ours):   AP email classified "bank change request" -> case opened -> hold BEFORE calling.
Trigger B (Ramp, backstop): webhook vendors.updated | bills.updated | bills.created
   -> GET /vendors/{id}/accounts?include_pending=true
   -> if any account id/last4/status not in our verified snapshot  => case + hold
   -> GET /vendors/{id}/contacts and diff phone vs our trusted_contact snapshot => phone-change flag (raises risk, never changes the number we dial)
Trigger C (poll, optional): GET /audit-logs/events?event_types=Bill pay bank account updated,Changed bank account on bill&from_date=...
```
Race to remember: a bank change can be applied inside Ramp before either trigger runs. Mitigation is that ACH takes "typically 2-5 business days" per Ramp, and holds block *scheduled* payments, so the hold lands before money leaves in the normal case.

### 1.3 Contacts: where the trusted number lives

`ApiVendorContactResource = {id, first_name, last_name, email, phone, is_default}`. `POST /vendors` also accepts `business_vendor_contacts: {email*, first_name, last_name, phone}`; "Vendors created in the API are approved by default, and are not subject to existing approval policies" (so seeding the sandbox via API is trivial). Observations that shape the data model:

- Ramp stores a **current** phone only. There is no history, no provenance, and no timestamp. If a scammer gets the contact edited, the old number is gone from the API.
- Therefore CounterCall must snapshot the number **before** any change window and keep its own `first_seen_at` / `source` / `last_verified_*` (Hand-offs section).
- Rule: the number we dial is the **oldest-provenance** number, never the Ramp "current" number if that number changed recently.

### 1.4 Auth and scopes

- Ramp uses OAuth 2.0. **Client Credentials** is the right grant (server-to-server, own business, no user interaction).
- Create the app: Ramp → Company → Developer (admin needed) → Create New App → Grant types → add **Client Credentials** → Scopes → Configure allowed scopes → copy Client ID/Secret. Sandbox and prod need **separate apps** (tokens only work in the environment that issued them).
- Token call (verbatim shape from Ramp quickstart):
```bash
curl -X POST 'https://demo-api.ramp.com/developer/v1/token' \
  -H "Authorization: Basic $(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "scope=vendors:read vendors:write bills:read bills:write payments:read"
# -> {"access_token":"ramp_business_tok_...","token_type":"Bearer","expires_in":864000,"scope":"..."}
```
- **If you omit `scope`, you get a token with no scopes** (silent 403s later). Token lifetime 10 days (864,000 s), **no refresh token** for client credentials; just request a new one. Never log tokens. Reuse tokens (token endpoint is rate limited).
- Scopes needed: `vendors:read`, `vendors:write` (vendor hold/release), `bills:read`, `bills:write` (bill hold/release, attachments, memo), `payments:read` (only for `payments.updated`), optional `audit_logs:read`. Creating webhook subscriptions requires the read scope for each subscribed event type. "Some endpoints also require a Ramp plan feature and return `403` without it, even with the right scope." Actions that need a user are attributed to the **app's creator** by default (so holds appear in Ramp's audit log as that user; good demo detail).
- If a scope is missing from the Configure-scopes list: "submit a Developer API support ticket". This is the main sandbox-day risk.
- Production distribution to other Ramp businesses is a separate path: Authorization Code flow, a **partner application** to get Developer console access, then a **production access application** per app. Two approvals, no stated SLA. Not for this hackathon; mention only as "how this becomes an installable Ramp app".

### 1.5 Sandbox access: process, lead time, verdict

**Cached `ramp_llms-guides_sandbox-access.txt` is empty (102 bytes).** The page is a JS-rendered form, so I rendered it in headless Chromium on 2026-11-09 (screenshot at `/tmp/pw03/sandbox.png`, not committed). Findings:

- URL: `https://docs.ramp.com/developer-api/v1/sandbox-access` ("Request sandbox access: Fill out the form below to request access to the Ramp sandbox environment.")
- Fields: **Email (required), Full name (required), Business name (required), Sandbox Name (optional), Company website (required), API use case (required, 20 character minimum)**, checkbox "I agree to the Ramp API agreement", button "Submit request".
- Lead time, per Ramp Help Center "Accessing the Developer API" (https://support.ramp.com/accessing-the-developer-api): "Request access using the sandbox access form. **Your sandbox should be ready in about one minute. Check your inbox for an account access email.**" Ramp then "provisions a sandbox business pre-populated with sample data (such as transactions, cards, users, departments, and reimbursements)". No review step is mentioned anywhere I could find. **[SINGLE-SOURCE, vendor-stated; not tested because I did not submit.]**
- After provisioning you still must create a **separate developer app inside the sandbox** (Company → Developer) to get sandbox client credentials. Budget 15-30 minutes.
- Sandbox base URLs: API `https://demo-api.ramp.com`, UI `https://demo.ramp.com`. "No real money movement." Demo actions panel (Cmd+J in the UI): "Mark bill as paid" (needs Admin/Business Owner or AP Clerk), "Create transaction", "Mark reimbursement as paid".
- **Could we have it by tomorrow? Yes, very likely tonight.** Recommendation: whoever has a work-ish email submits the form now with business name "CounterCall (UC Berkeley hackathon)" and a real URL (GitHub repo URL is probably fine, unverified). Use the use case text in the box below.

> API use case (suggested, 20+ chars): "BBS x Ramp hackathon project: when a vendor bank-detail change is detected, place a hold on the vendor/bills via the Developer API, verify by phone callback, and release or keep the hold. Uses vendors, bills, webhooks."

Unknowns to burn down first hour after access (each could break the live demo): (1) does the sandbox business have Bill Pay enabled and a funding bank account (`BILL_PAY_BANK_ACCOUNT` usage type on `GET /entities`)? (2) do `bills:write`/`vendors:write` appear in the scope picker? (3) is the **vendor edit approval policy** on, so `update-bank-accounts` returns `pending_approval`? (4) does vendor hold return 204 or 202? (5) what `status_summary` does a held bill show? (6) are webhook deliveries to a Vercel URL reliable? (7) signature encoding.

Sandbox seeding script outline (all via API, all approved by default for vendors): `GET /entities` (entity_id + bank_accounts[usage_type=BILL_PAY_BANK_ACCOUNT].id) → `POST /vendors` {name:"Acme Industrial Supply", business_vendor_contacts:{email, phone: <team-owned number>}} → `POST /vendors/{id}/update-bank-accounts` {ach_details} → `GET /vendors/{id}/accounts` + `/contacts` → `POST /bills` {vendor_id, vendor_contact_id, entity_id, invoice_number, invoice_currency:"USD", issued_at, due_at, payment_method:"ACH", payment_details:{payment_arrival_date, source_bank_account_id, vendor_account_id}}. `POST /bills` creates an **already-approved** bill (good: it is immediately holdable).

### 1.6 TypeScript: types, `RampClient`, real client, mock

Derived field-by-field from the OpenAPI. **Compiled with `tsc --strict` (TypeScript 5.9, target es2022) and a runtime self-check passes** (`node --experimental-strip-types check.ts`: vendor hold flips the bill to `ON_HOLD`, seed object not mutated, signed-webhook round trip, factory rejects sandbox mode without credentials). Files proposed: `lib/ramp.ts` (173 lines) and `lib/ramp.check.ts`.

Design points:
- **One interface, three implementations behind it**: `MockRampClient` (default), `HttpRampClient` (sandbox or prod). `RAMP_MODE=mock|sandbox|prod` picks one; `RAMP_BASE_URL` overrides. The rest of the app imports only `RampClient`.
- The mock returns **the exact JSON shapes** (`Bill`, `Page<T>`, 204/202 as a tagged union) and appends the literal HTTP line it is imitating to `trace[]`, e.g. `POST /developer/v1/vendors/{id}/hold {"reason":"..."} -> 204`. Render that array in the dashboard "Ramp API" panel and the narration "calls `POST /bills/{id}/hold`" is literally on screen, then flips to the real sandbox with one env var.
- The mock can simulate Ramp's 202 path (`vendorHoldNeedsApproval: true`) so the demo can show the fallback: vendor hold pending, so also bill-level hold (200). Fail-closed.
- Mock state changes are **immutable updates** and the constructor copies the seed.
- Mark UNVERIFIED mock transitions: release target state `AWAITING_PAYMENT`; vendor hold marks open bills `ON_HOLD`. Confirm in sandbox and adjust.
- Webhook helper `signedEvent()` creates a correctly-signed event, so the **same** webhook route and `verifyRampSignature` are exercised in mock mode.
- Real client details worth keeping: `scope` is always sent; token cached with 60 s early expiry; any non-expected status throws (**caller keeps the hold**); `holdVendor`/`releaseVendor` map 204 to `applied` and 202 to `pending_approval`; attachments use `FormData`.

`lib/ramp.ts`:
```ts
// lib/ramp.ts: Ramp Developer API v1 subset for CounterCall.
// Derived from https://docs.ramp.com/openapi/developer-api.json (cached 2026-11-09). Fields marked UNVERIFIED are assumptions to confirm in the sandbox.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

// ---------- shared shapes ----------
export type UUID = string
export interface CurrencyAmount { amount: number; currency_code: string; minor_unit_conversion_rate: number | null } // amount in minor units (cents)
export interface RampPage<T> { data: T[]; page: { next: string | null } } // next = "<BASE_URL>?<params>"; pass `start` = last id to page
export interface RampError { error_v2: { error_code: string; error_id: string; message: string; notes: string | null; additional_info: Record<string, unknown> } }

// ---------- bills ----------
export type RampBillStatusSummary =
  | 'APPROVAL_PENDING' | 'APPROVAL_REJECTED' | 'ARCHIVED' | 'AWAITING_PAYMENT' | 'AWAITING_RELEASE' | 'BLOCKED' | 'HELD_BY_PROVIDER'
  | 'ON_HOLD' | 'PAYMENT_COMPLETED' | 'PAYMENT_DETAILS_MISSING' | 'PAYMENT_ERROR' | 'PAYMENT_NOT_INSTRUCTED' | 'PAYMENT_PROCESSING'
  | 'PAYMENT_READY' | 'PAYMENT_SCHEDULED' | 'PENDING_VENDOR_APPROVAL' | 'WAITING_FOR_TRANSACTION_MATCH' | 'WAITING_FOR_TRANSFER_MATCH' | 'WAITING_FOR_VENDOR'
export type RampApprovalStatus = 'APPROVED' | 'INITIALIZED' | 'PENDING' | 'REJECTED' | 'TERMINATED'
export type RampPaymentMethod = 'ACH' | 'CARD' | 'CHECK' | 'DOMESTIC_WIRE' | 'INTERNATIONAL' | 'SWIFT' | 'RTP' | 'FED_NOW' | 'CRYPTO_WALLET_TRANSFER' | 'PAID_MANUALLY' | 'UNSPECIFIED' // subset of 18
export interface RampBillPayment {
  id: UUID | null; amount: CurrencyAmount; payment_method: RampPaymentMethod | null
  payment_date: string | null; effective_date: string | null; customer_friendly_payment_id: string | null
  details: { vendor_account_id?: UUID | null; source_bank_account_id?: UUID | null; is_same_day?: boolean; approval_status?: RampApprovalStatus | null }
}
export interface RampBill {
  id: UUID; amount: CurrencyAmount; invoice_number?: string; issued_at: string; due_at: string; created_at: string; entity_id: UUID
  approval_status: RampApprovalStatus | null
  status: 'OPEN' | 'PAID'                         // payment status
  status_summary: RampBillStatusSummary           // hold shows up here as ON_HOLD (UNVERIFIED: confirm in sandbox)
  vendor: { id: UUID; name: string; remote_id?: string; remote_name?: string; type?: 'BUSINESS' | 'INDIVIDUAL' }
  vendor_contact_id: UUID | null
  payment: RampBillPayment | null
  memo?: string; vendor_memo?: string; paid_at?: string; archived_at: string | null
}
export interface ListBillsQuery {                 // GET /developer/v1/bills filters we use (all optional)
  vendor_id?: UUID; status_summaries?: RampBillStatusSummary[]; approval_status?: RampApprovalStatus
  payment_status?: 'OPEN' | 'PAID'; payment_method?: RampPaymentMethod; invoice_number?: string
  from_created_at?: string; from_payment_date?: string; to_payment_date?: string   // no updated_at filter exists
  page_size?: number; start?: string              // page_size 2..100, default 20
}

// ---------- vendors ----------
export interface RampVendor {
  id: UUID; name: string; display_name: string | null; name_legal?: string; country: string; is_active: boolean
  approval_status: 'APPROVED' | 'PENDING' | 'REJECTED'; contacts: UUID[]; created_at: string; updated_at: string | null
  default_payment_method: { update_source: 'AUTO' | 'MANUAL' | null; policy: { kind: 'ADDRESS' | 'BANK_ACCOUNT' | 'CARD' | 'DIRECT_DEBIT' } | null } | null
}
export interface RampVendorBankAccount {          // GET /vendors/{id}/accounts (add ?include_pending=true to see proposals)
  id: UUID; payment_method: RampPaymentMethod; currency: string; is_default: boolean
  account_number_last_four: string | null; account_nickname?: string
  status: 'active' | 'pending_approval' | 'pending_deletion'
  proposal_id: UUID | null                        // set while pending; a pending account gets a NEW id once approved
}
export interface RampVendorContact {              // GET /vendors/{id}/contacts. `phone` is the only phone field. No created_at, no source, no verified flag.
  id: UUID; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; is_default: boolean
}
export interface VendorEditResult { status: 'approved' | 'pending_approval'; vendor_id: UUID; proposal_id: UUID | null } // update-bank-accounts / contacts POST responses (+ payment_method_id / contact_id)
export type VendorHoldResult = { kind: 'applied' } | { kind: 'pending_approval' } // 204 = applied, 202 = needs Ramp-side approval (release too)

// ---------- webhooks ----------
export type RampWebhookEventType =              // the subset we subscribe to; full list in guides/webhooks
  | 'vendors.updated' | 'vendors.approved' | 'vendors.activated'
  | 'bills.created' | 'bills.updated' | 'bills.approved' | 'bills.rejected' | 'bills.paid' | 'draft_bills.created' | 'payments.updated'
export interface RampWebhookEvent {               // delivered with headers X-Ramp-Signature (HMAC-SHA256 of raw body) and X-Ramp-Webhook-ID (== id)
  id: string; type: RampWebhookEventType | (string & {}); created_at: string; business_id: UUID
  object: { id: UUID } & Record<string, unknown>  // ONLY the resource id (+ maybe metadata). No diff, no old/new bank values: re-fetch.
}
export const SCOPES = ['vendors:read', 'vendors:write', 'bills:read', 'bills:write', 'payments:read'] as const // + 'audit_logs:read' if polling audit log

// ---------- the interface the app codes against ----------
export interface RampClient {
  getVendor(id: UUID): Promise<RampVendor>
  listVendorAccounts(id: UUID, o?: { includePending?: boolean }): Promise<RampPage<RampVendorBankAccount>>
  listVendorContacts(id: UUID): Promise<RampPage<RampVendorContact>>
  getBill(id: UUID): Promise<RampBill>
  listBills(q?: ListBillsQuery): Promise<RampPage<RampBill>>
  holdBill(id: UUID, reason?: string): Promise<RampBill>        // POST /bills/{id}/hold    (bills:write) -> 200 Bill
  releaseBill(id: UUID): Promise<RampBill>                      // POST /bills/{id}/release (bills:write) -> 200 Bill
  holdVendor(id: UUID, reason?: string): Promise<VendorHoldResult>   // POST /vendors/{id}/hold    (vendors:write) -> 204 | 202
  releaseVendor(id: UUID): Promise<VendorHoldResult>                 // POST /vendors/{id}/release (vendors:write) -> 204 | 202
  attachFileToBill(id: UUID, file: { name: string; bytes: Uint8Array; mime: string }): Promise<{ id: UUID }> // POST /bills/{id}/attachments multipart, attachment_type=FILE
}
export const verifyRampSignature = (rawBody: string | Buffer, header: string | null, secret: string): boolean => {
  if (!header) return false
  const mac = createHmac('sha256', secret).update(rawBody).digest('hex') // hex assumed from the 64-char sample header; confirm in sandbox
  const a = Buffer.from(mac), b = Buffer.from(header.trim().toLowerCase())
  return a.length === b.length && timingSafeEqual(a, b)
}

// ---------- real client (sandbox or prod): one env var flips mock -> sandbox ----------
const BASES = { sandbox: 'https://demo-api.ramp.com', prod: 'https://api.ramp.com' } as const
export class HttpRampClient implements RampClient {
  private tok?: { v: string; exp: number }
  private base: string; private id: string; private secret: string; private fetchFn: typeof fetch
  constructor(base: string, id: string, secret: string, fetchFn: typeof fetch = fetch) { this.base = base; this.id = id; this.secret = secret; this.fetchFn = fetchFn }
  private async token(): Promise<string> {   // client_credentials; token lives 10 days; no refresh token; omit `scope` = a token with NO scopes
    if (this.tok && this.tok.exp > Date.now() + 60_000) return this.tok.v
    const r = await this.fetchFn(`${this.base}/developer/v1/token`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${this.id}:${this.secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPES.join(' ') }),
    })
    if (!r.ok) throw new Error(`ramp token ${r.status}`)
    const j = (await r.json()) as { access_token: string; expires_in: number }
    this.tok = { v: j.access_token, exp: Date.now() + j.expires_in * 1000 }
    return j.access_token
  }
  private async call<T>(method: string, path: string, body?: unknown, ok: number[] = [200]): Promise<{ status: number; json: T }> {
    const isForm = body instanceof FormData
    const r = await this.fetchFn(`${this.base}/developer/v1${path}`, {
      method, headers: { Authorization: `Bearer ${await this.token()}`, ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
    if (!ok.includes(r.status)) throw new Error(`ramp ${method} ${path} -> ${r.status} ${await r.text()}`)   // fail closed: caller keeps the hold
    return { status: r.status, json: (r.status === 204 ? undefined : await r.json()) as T }
  }
  private qs = (q: object) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, Array.isArray(v) ? v.join(',') : String(v)); const s = p.toString(); return s ? `?${s}` : '' }
  getVendor = (id: UUID) => this.call<RampVendor>('GET', `/vendors/${id}`).then(r => r.json)
  listVendorAccounts = (id: UUID, o: { includePending?: boolean } = {}) => this.call<RampPage<RampVendorBankAccount>>('GET', `/vendors/${id}/accounts${this.qs({ include_pending: o.includePending })}`).then(r => r.json)
  listVendorContacts = (id: UUID) => this.call<RampPage<RampVendorContact>>('GET', `/vendors/${id}/contacts`).then(r => r.json)
  getBill = (id: UUID) => this.call<RampBill>('GET', `/bills/${id}`).then(r => r.json)
  listBills = (q: ListBillsQuery = {}) => this.call<RampPage<RampBill>>('GET', `/bills${this.qs(q)}`).then(r => r.json)
  holdBill = (id: UUID, reason?: string) => this.call<RampBill>('POST', `/bills/${id}/hold`, reason ? { reason } : undefined).then(r => r.json)
  releaseBill = (id: UUID) => this.call<RampBill>('POST', `/bills/${id}/release`).then(r => r.json)
  holdVendor = (id: UUID, reason?: string) => this.call('POST', `/vendors/${id}/hold`, reason ? { reason } : undefined, [202, 204]).then(r => ({ kind: r.status === 204 ? 'applied' : 'pending_approval' }) as VendorHoldResult)
  releaseVendor = (id: UUID) => this.call('POST', `/vendors/${id}/release`, undefined, [202, 204]).then(r => ({ kind: r.status === 204 ? 'applied' : 'pending_approval' }) as VendorHoldResult)
  attachFileToBill = (id: UUID, f: { name: string; bytes: Uint8Array; mime: string }) => {
    const fd = new FormData(); fd.set('attachment_type', 'FILE'); fd.set('file', new Blob([f.bytes as BlobPart], { type: f.mime }), f.name)
    return this.call<{ id: UUID }>('POST', `/bills/${id}/attachments`, fd, [200, 201]).then(r => r.json)
  }
}

// ---------- mock: same method names, same JSON shapes, logs the exact HTTP line the demo should "say" ----------
export interface MockSeed { vendors: RampVendor[]; accounts: Record<UUID, RampVendorBankAccount[]>; contacts: Record<UUID, RampVendorContact[]>; bills: RampBill[] }
export class MockRampClient implements RampClient {
  readonly trace: string[] = []                    // feed this to the dashboard's "Ramp API" panel
  private vendorHolds = new Set<UUID>()
  private s: MockSeed; private opts: { vendorHoldNeedsApproval?: boolean }
  constructor(seed: MockSeed, opts: { vendorHoldNeedsApproval?: boolean } = {}) { this.s = { ...seed, bills: [...seed.bills] }; this.opts = opts } // copy: never mutate caller's seed
  private log = (line: string) => { this.trace.push(line) }
  private page = <T>(data: T[]): RampPage<T> => ({ data, page: { next: null } })
  private bill(id: UUID) { const b = this.s.bills.find(x => x.id === id); if (!b) throw new Error(`ramp GET /bills/${id} -> 404`); return b }
  private setBill(id: UUID, p: Partial<RampBill>): RampBill { const i = this.s.bills.findIndex(x => x.id === id); this.bill(id); this.s.bills[i] = { ...this.s.bills[i], ...p }; return this.s.bills[i] } // immutable update
  async getVendor(id: UUID) { this.log(`GET /developer/v1/vendors/${id}`); const v = this.s.vendors.find(x => x.id === id); if (!v) throw new Error('404'); return v }
  async listVendorAccounts(id: UUID, o: { includePending?: boolean } = {}) { this.log(`GET /developer/v1/vendors/${id}/accounts${o.includePending ? '?include_pending=true' : ''}`); return this.page((this.s.accounts[id] ?? []).filter(a => o.includePending || a.status === 'active')) }
  async listVendorContacts(id: UUID) { this.log(`GET /developer/v1/vendors/${id}/contacts`); return this.page(this.s.contacts[id] ?? []) }
  async getBill(id: UUID) { this.log(`GET /developer/v1/bills/${id}`); return this.bill(id) }
  async listBills(q: ListBillsQuery = {}) { this.log(`GET /developer/v1/bills${q.vendor_id ? `?vendor_id=${q.vendor_id}` : ''}`); return this.page(this.s.bills.filter(b => (!q.vendor_id || b.vendor.id === q.vendor_id) && (!q.status_summaries || q.status_summaries.includes(b.status_summary)))) }
  async holdBill(id: UUID, reason?: string) { this.log(`POST /developer/v1/bills/${id}/hold ${JSON.stringify({ reason })} -> 200`); return this.setBill(id, { status_summary: 'ON_HOLD' }) }
  async releaseBill(id: UUID) { this.log(`POST /developer/v1/bills/${id}/release -> 200`); return this.setBill(id, { status_summary: 'AWAITING_PAYMENT' }) } // UNVERIFIED target state
  async holdVendor(id: UUID, reason?: string): Promise<VendorHoldResult> {
    this.log(`POST /developer/v1/vendors/${id}/hold ${JSON.stringify({ reason })} -> ${this.opts.vendorHoldNeedsApproval ? 202 : 204}`)
    if (this.opts.vendorHoldNeedsApproval) return { kind: 'pending_approval' }
    this.vendorHolds.add(id)   // real Ramp also removes open bills from scheduled payment flows
    this.s.bills.filter(b => b.vendor.id === id && b.status === 'OPEN').forEach(b => this.setBill(b.id, { status_summary: 'ON_HOLD' }))
    return { kind: 'applied' }
  }
  async releaseVendor(id: UUID): Promise<VendorHoldResult> { this.log(`POST /developer/v1/vendors/${id}/release -> 204`); this.vendorHolds.delete(id); return { kind: 'applied' } } // real Ramp: bills must be re-scheduled after release
  async attachFileToBill(id: UUID, f: { name: string; bytes: Uint8Array; mime: string }) { this.log(`POST /developer/v1/bills/${id}/attachments (FILE ${f.name}) -> 201`); this.bill(id); return { id: randomUUID() } }
  /** Build a webhook exactly as Ramp would send it (POST /webhooks/mock-webhook-event does this in the real sandbox). */
  signedEvent(type: RampWebhookEventType, objectId: UUID, secret: string, businessId = randomUUID()) {
    const ev: RampWebhookEvent = { id: randomUUID(), type, created_at: new Date().toISOString(), business_id: businessId, object: { id: objectId } }
    const raw = JSON.stringify(ev)
    return { raw, headers: { 'x-ramp-signature': createHmac('sha256', secret).update(raw).digest('hex'), 'x-ramp-webhook-id': ev.id } }
  }
}

// ---------- factory: RAMP_MODE=mock|sandbox|prod ----------
export function makeRamp(env: Record<string, string | undefined>, seed: MockSeed): RampClient {
  const mode = env.RAMP_MODE ?? 'mock'
  if (mode === 'mock') return new MockRampClient(seed)
  if (mode !== 'sandbox' && mode !== 'prod') throw new Error(`RAMP_MODE must be mock|sandbox|prod, got ${mode}`)
  if (!env.RAMP_CLIENT_ID || !env.RAMP_CLIENT_SECRET) throw new Error('RAMP_CLIENT_ID / RAMP_CLIENT_SECRET required')
  return new HttpRampClient(env.RAMP_BASE_URL ?? BASES[mode], env.RAMP_CLIENT_ID, env.RAMP_CLIENT_SECRET)
}
```

`lib/ramp.check.ts` (the one runnable check):
```ts
// Smallest runnable check: node --experimental-strip-types check.ts  (fails loudly if the mock drifts from the contract)
import assert from 'node:assert/strict'
import { MockRampClient, makeRamp, verifyRampSignature, type MockSeed, type RampBill } from './ramp.ts'

const V = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
const bill: RampBill = {
  id: B, amount: { amount: 4_820_000, currency_code: 'USD', minor_unit_conversion_rate: 100 }, invoice_number: 'INV-2291',
  issued_at: '2026-11-02', due_at: '2026-11-16', created_at: '2026-11-02T10:00:00Z', entity_id: 'e', approval_status: 'APPROVED', status: 'OPEN',
  status_summary: 'PAYMENT_SCHEDULED', vendor: { id: V, name: 'Acme Industrial Supply' }, vendor_contact_id: 'c1', payment: null, archived_at: null,
}
const seed: MockSeed = { vendors: [], accounts: {}, contacts: {}, bills: [bill] }
const ramp = makeRamp({ RAMP_MODE: 'mock' }, seed) as MockRampClient

const held = await ramp.holdVendor(V, 'CounterCall: bank change unverified')
assert.equal(held.kind, 'applied')
assert.equal((await ramp.getBill(B)).status_summary, 'ON_HOLD')
assert.equal(bill.status_summary, 'PAYMENT_SCHEDULED', 'seed object must not be mutated')
assert.ok(ramp.trace[0].startsWith(`POST /developer/v1/vendors/${V}/hold`))

const { raw, headers } = ramp.signedEvent('vendors.updated', V, 's3cret')
assert.ok(verifyRampSignature(raw, headers['x-ramp-signature'], 's3cret'))
assert.ok(!verifyRampSignature(raw + ' ', headers['x-ramp-signature'], 's3cret'))
assert.throws(() => makeRamp({ RAMP_MODE: 'sandbox' }, seed), /CLIENT_ID/)
console.log('ok', ramp.trace)
```

### 1.7 Demo narration to API mapping (what the screen can truthfully say)

| Demo moment | Real Ramp call (mock logs the same line) |
|---|---|
| "CounterCall freezes the payment" | `POST /developer/v1/vendors/{vendor_id}/hold` (fallback `POST /developer/v1/bills/{bill_id}/hold`) |
| "It pulls the vendor's trusted number" | our `trusted_contact` table; cross-check `GET /developer/v1/vendors/{id}/contacts` (phone) |
| "Compares to the account on file" | `GET /developer/v1/vendors/{id}/accounts?include_pending=true` |
| "Vendor says no, payment blocked, email flagged" | hold stays; `POST /developer/v1/bills/{id}/attachments` (transcript PDF, `FILE`); `PATCH /developer/v1/bills/{id}` memo |
| "Vendor says yes, we did change banks" | policy engine passes -> `POST /developer/v1/vendors/{id}/release` (humans still approve the Ramp edit proposal; the API cannot) |
| "Ramp told us something changed" | webhook `vendors.updated` -> re-fetch |

---

## 2. What Ramp already does, and the competitive landscape

### 2.1 Ramp's own controls (primary sources, accessed 2026-11-09)

| Capability | What it actually is | Source |
|---|---|---|
| AI fraud scanning on drafts/bills | "Our AI-powered system analyzes dozens of risk factors including vendor authenticity, payment details, invoice patterns, and unusual activity." Alerts "highlighting specific concerns, such as **new or changed bank account details**, unusual invoice amounts, or vendors that haven't been verified across our network". Yellow = medium, red = high severity. Dismissing a red alert prompts for a reason; every dismissal is audit-logged (`Bill pay dismissed fraud alert`). | https://support.ramp.com/bill-pay-fraud |
| What Ramp tells the customer to do on an alert | "we recommend you double-check with your vendor **through a separate communication channel** before proceeding with payment" and "Always confirm payment instructions directly with vendors or suppliers **using a verified phone number**, especially if account details change... don't reply to the same email or call back the same number." | same |
| Fraud prevention agent ("Agents for AP", launched **2025-10-07**) | "Agents analyze **63 pieces of data** including payment history and vendor details to alert of suspicious invoices and vendor changes before the bill is created." "For early access customers, Agents for AP flagged **over $1 million** in fraudulent invoices in just 90 days" (Ramp internal data, Sept 2025; counts bills "subsequently deleted"). Elsewhere Ramp says "60+ signals" and (May 2026 blog) "Ramp identified **$5M+** in fraud before invoices were sent off for approval." Inconsistent counts: **do not quote one number as definitive.** | PR Newswire 2025-10-07; https://ramp.com/blog/accounts-payable/invoice-fraud (updated 2026-05-29) |
| Network skip | "Verified vendors in Ramp's vendor network **skip these checks**, so legitimate payments go through smoothly." | https://ramp.com/blog/agentic-ai/best-ai-agents-for-ap-automation (2025-11-03) |
| Vendor ownership verification | Only if the payer picks "Ask vendor to confirm they own this account." Checks account-holder data via bank/provider data or documents. "An ownership check may require your review and **does not guarantee against fraud**." "A successful bank connection alone is not the same as a confirmed ownership match." Email-link based (vendor portal), links expire in 30 days. | https://support.ramp.com/vendor-verification |
| Vendor edit approvals | Payer-configured approval policies on vendor edits; bank/tax/address changes from the Vendor Network "can then require your configured vendor edit approvals". One narrow auto path: a connected vendor replacing an accepted ACH account with a **Ramp Checking Account** can apply "without your acceptance or vendor edit approval" if "Auto-approve ACH details from bank accounts verified by Ramp" is on. | https://support.ramp.com/ramp-vendor-network |
| AP inbox automation (Beta, Ramp Plus) | Connects one Gmail inbox; Ramp "reviews emails against your AP Intake Policy, filters duplicates and emails that do not meet the policy, creates **draft bills** from eligible invoices". Overlaps with "reads incoming AP email" only for invoices. Whether it classifies a *non-invoice bank-change email* is **not stated** (inference: likely skipped as not meeting policy; unverified). | https://support.ramp.com/ap-agents-available-in-ramp-bill-pay |
| Nacha readiness | Ramp blog (2026-05-14) ties Bill Pay to Phase 2 readiness. See 4.1 for its two overstatements. | https://ramp.com/blog/2026-nacha-rule-changes |
| Platform context | Oct 15 2026: $60B valuation, >85,000 customers, >$2B annualized revenue, >$275B annualized purchase volume (TechCrunch). Ramp also ships Ramp MCP and CLI, an "agent card", Glass (Oct 2026). Acquisitions in 2026: Billhop (Mar), Juno (Mar), Vesto (Oct, single aggregator). **None are fraud/voice/AP-verification companies.** | https://techcrunch.com/2026/10/15/ramp-reaches-60b-valuation-as-it-pushes-deeper-into-ai/ |

**What I could not find:** any Ramp feature that places an outbound verification call, or Ramp's phone-based callback automation. Ramp says it doesn't disclose "the full set of tools, methods, and procedures we use for fraud detection", so absence from public docs is not proof. Say "we haven't seen Ramp ship this" not "Ramp doesn't have this".

### 2.2 The gap CounterCall fills (the honest version)

1. Ramp detects and **alerts a human**; the callback is the customer's job. Ramp's alert UI says to do exactly what we automate.
2. Ramp's checks are **data-based** (signals, network verification, bank/provider ownership data). A mule account opened under a look-alike LLC can pass a name-ownership check. A call to the real vendor's real phone asks the one question data cannot: "did *you* ask for this?"
3. Alerts are dismissible with a typed reason. A recorded, structured callback outcome is a stronger piece of evidence than a free-text dismissal.
4. Our **email trigger** can fire before anyone edits Ramp (the scam email arrives first). Ramp's alert fires when the bill/vendor is edited or created.
5. No provenance on contact phone numbers in the API (1.3).

### 2.3 Competitors and adjacent tools

| Player | What they do | Callback? | AI voice? | Notes / source |
|---|---|---|---|---|
| **nsKnox** (PaymentKnox) | Bank-account validation network ("Quick Check", "KnoxVerify"). **AI Agent Caller launched 2026-07-01**: autonomous, multilingual, local-business-hours scheduling, introduces itself, tells payee the call is recorded, asks payee to confirm "the last digits of a known bank account" not full details, strict retry limits on mismatch, recording + summary in "Work Canvas", triggerable from a payee record, policy triggers on amount/geographic risk. Positions the call as a layer **on top of** bank-data validation. Listed as a Nacha Preferred Partner. | Yes | **Yes, shipped** | https://nsknox.net/ai-agent-caller/ ; GlobeNewswire 2026-07-01 (page blocked to curl; confirmed via PATech Labs 2026-07-07 and search metadata). Vendor claims, no independent evaluation. Pricing not public. |
| **Trustpair** | Account validation in 190 countries (vendor claim), plus callback playbooks. Its content says: callback confirms the vendor requested the change but "does not always prove the new account belongs to the vendor"; pair with ownership checks, dual approval, payment hold. | Process guidance; automated validation is the product | No AI caller found | Pricing custom. (trustpair.com blocks curl; read via search summaries.) |
| **Eftsure** | Independent business data + **human** verification experts who phone an **independently sourced** number, quoting a 4-digit reference from the vendor's form; reads last 3 digits of account and asks the vendor to confirm the rest. Bank-link via Yodlee/Open Banking. "Eftsure Guarantee up to US$1M" for social-engineering losses (their claim). Expanded to Singapore Aug 2026; "4,000+ customers, 11M monitored vendors" (company-reported). | Yes, human | No | https://www.eftsure.com |
| **Traceless Verify** | Argues callbacks are broken (attacker controls the callback path; 3 s of audio clones a voice) and replaces them with **authenticated identity verification** (passkey, Okta/Duo/Entra, Verified ID). | Replaces it | No | https://traceless.com/learn/vendor-payment-fraud-and-why-verification-keeps-failing/ (2026-06-03). **This is the sharpest critique we face; Q&A #5 and #6 answer it.** |
| **Diopter AI** | Detects vendor impersonation and cloned voice **on inbound calls/meetings** where AP acts; "hold the banking-detail change until the number of record confirms it." | n/a (detection, not outbound) | Detection | https://diopter.ai/solutions/vendor-impersonation |
| **AppZen** | "Bank Change Verification" agent in AP Inbox Service Center (2026-04-21) that escalates bank-change requests to vendor management with a risk rating; draft-for-review mode. | No (escalates) | No | PR Newswire 2026-04-21 (via search summary) |
| **Trouvé** (GitHub `Connor-W-Cahill/callback`, SteelHacks XIII, Univ. of Pittsburgh, 2026-09-19/20; hackathon prototype, 0 stars, no license) | Seeded inbox -> extract -> risk score -> **policy hold** on any payment-detail change -> ElevenLabs voice call to the vendor-master number -> Nemotron judge reads the transcript (confirmed / denied / unclear) -> updates its own vendor table. Optional Twilio phone path, off by default. 79 labeled emails + 20 labeled transcripts in `evals/`. | Yes (demo vendor side is mic / typed / scripted; real call optional) | Yes (ElevenLabs TTS/STT) | Read from the repo, not run. **No mention of Ramp or any AP/payment system anywhere in the repo** (case-insensitive grep). Holds are rows in its own SQLite DB. Details and comparison in 2.6. |
| **CallbackProof** (callbackproof.com) | "Verification records for vendor bank-detail changes": case checklist, shareable client intake form, dual approval, SHA-256 hash-chained audit log, per-case PDF records for insurers/auditors. Built for **bookkeeping/accounting firms** managing AP for many clients. | **No.** Staff make the call and log it. | No | $99/mo Starter (25 clients), $199/mo Firm (unlimited clients), 14-day trial. Site says it "does not screen or block payments", "does not validate bank-account ownership" and "is not a fraud-prevention service or guarantee"; no integrations mentioned (no Ramp, BILL, QuickBooks). Vendor's own site only **[SINGLE-SOURCE]**. |
| **BILL** | After a bank change places a **$0.01 test deposit** (1-2 business days); emails the vendor; help page recommends confirming verbally. | Recommends, does not do | No | https://help.bill.com/direct/s/article/360000009246 |
| **Tipalti** | Ownership checks at onboarding, UK/EU Verification of Payee, Do-Not-Pay screening, "Tipalti Detect" flags suspicious payees; changing payee name resets payment details. No standalone callback requirement found. | Not found | No | help.tipalti.com / tipalti.com |
| **Paymode (Bottomline)** | Closed network; each vendor checked against "300+ data points", step-up authentication on bank changes, bank data verified via Plaid; "zero fraud losses" is self-reported and applies only to enrolled vendors. | Bank changes "don't rely on emails and phone numbers alone" | No | bottomline.com/us/paymode |
| **AvidXchange** | Security page is high-level. Its blog: only **43%** of AP departments use automated bank-account verification. No callback feature found. | Not found | No | https://www.avidxchange.com/security/ |
| **Coupa, Medius** | **No primary source found in my searches.** Do not make claims. | ? | ? | |
| **Account-ownership data** | **Early Warning / "Certos"** (Early Warning's identity and payment-risk solutions now sold as Certos; "Verify Account" / Account Owner Authentication, bank-contributed data; wording is person-focused, business-account coverage **[UNVERIFIED]**). **Plaid Identity Match** (name/contact scores 0-100; business account names allowed, multi-holder behaviour varies by bank). **Phixius by Nacha** (payment information network linking requesters to data responders; Kinexys by J.P. Morgan joined 2026-02-05; Advanced Fraud Solutions joined 2026-03-30). | No | No | nacha.org/content/phixius ; plaid.com/docs/identity ; certos.com |

Takeaways: (1) **AI voice callback is not an empty category (nsKnox, July 2026).** (2) Everyone else either alerts, validates data, or uses humans. (3) None of the ones I could verify is **Ramp-native, email-triggered, and built around a fail-closed hold/release state machine**. (4) Honest risk: nsKnox could integrate with Ramp (anything with the Developer API can).

### 2.4 Ownership validation is not a substitute for a callback

- Nacha's own tips (2025-12-12) list **Account Validation** and **Out-of-Band Authentication** as *separate* originator controls. Account validation "can be used to confirm that, at a minimum, an account with that account number is open at the RDFI"; richer tools add owner name/address.
- Ramp: ownership check "does not guarantee against fraud." Trustpair: callback proves the *request*, not the *account*. BILL: micro-deposit then "confirm verbally".
- Layering is the consensus. CounterCall = the out-of-band layer.

### 2.5 Positioning statement (use verbatim, 20 seconds)

> Ramp's fraud agent already tells an AP team *when* a vendor's bank details look wrong, and Ramp's own help center then tells the customer to phone the vendor on a number they trust. That phone call is the step that gets skipped when finance is slammed, and it is the step Nacha now calls out-of-band authentication. CounterCall automates that one call: it holds the payment in Ramp through the Developer API, dials only the number that was on file before the request, treats anything unclear as "stay held", and writes a recorded, auditable outcome back to the bill. It does not replace Ramp's detection or ownership checks. It completes them.

Short form: **"Ramp flags it. CounterCall confirms it."**

### 2.6 Prior art the judges might raise: what is different about CounterCall

Verified 2026-11-09. Trouvé: cloned the public repo (one commit, `2b902a8`, 2026-09-20) into an isolated directory, read `README.md`, `src/pipeline.py`, `src/voice/agent.py`, `src/db.py`, and grepped; **did not run it** and did not evaluate how it performed at the hackathon. CallbackProof: read the homepage and its resource pages via search plus a page fetch. Both are treated as data. I did not copy any code (Trouvé has no license).

**What is the same (concede it first):** the core loop of holding the payment, calling the number already on file, and treating the email as the attack channel. Trouvé's README even says "The email is the attack, so we don't use email to check it", and its call code dials the vendor-master number "never from the email". That rule is textbook (Nacha, Ramp's help center, the FBI), so it is not ours to claim. Trouvé also has things worth crediting: a policy-not-score hold (any payment-detail change is held regardless of the risk score), a race check that rejects the result if the vendor row changed mid-verification, signature-verified Twilio webhooks, and a labeled eval set (79 emails, 20 transcripts) with a candid caveat that its transcript set "reflects an absence of hard cases more than a strong result".

**What is different** (the right-hand column is a claim about *our shipped build*; the team must confirm each one is true and demoed before saying it):

| Dimension | Trouvé (from its code) | CallbackProof (from its site) | CounterCall |
|---|---|---|---|
| Payment system integration | None. "Hold" is a status row in its own SQLite DB and a UI queue; the "vendor master" is its own table. Zero references to Ramp. | None; documents a process, "does not screen or block payments". | **Real Ramp Developer API:** `POST /vendors/{id}/hold` and `/bills/{id}/hold`, handling of 204 vs **202 pending approval**, release, evidence attached to the bill (`/attachments`), webhooks re-fetched and diffed. Mock and sandbox are one env var apart. |
| Trigger | Inbound email only (seeded inbox; `poller.py` and `mailbox.py` also exist, not read). | Client intake form filled by a human. | **Two triggers:** email, plus Ramp-side `vendors.updated` / `bills.updated` -> re-fetch -> diff `accounts?include_pending=true`. Catches a change made inside Ramp that no email announced. |
| Trusted number | One column, `phone_on_file TEXT NOT NULL`; no source, no first-seen date, no history. | A human sources an "independent contact" (their guide says to use a number from before the request). | **Provenance model:** `trusted_contact` with `source`, `first_seen_at`, `status` (trusted / quarantined); a phone change in the same window is quarantined and we dial the oldest-provenance number (Section 7.1). Ramp's own contacts API has no such history (1.3). |
| What the call asks | Reads the claimed new account's last four and the routing number aloud, then asks a closed question: "Did your company send that request, and are these payment details correct?" No request-specific challenge found in the code (grepped). | Not applicable (human call). | **Knowledge challenge** that only the real AP contact can answer (last invoice or PO number, never an account number), and we do not read attacker-supplied account details to the callee (Q&A #16). *Only claim this if the shipped agent does it.* |
| Who can release money | The judge verdict (Nemotron model; deterministic offline fallback) maps one-to-one to status: `confirmed` -> `approved` and the vendor's bank details are rewritten. The only guard I found is an override to "unclear" when payment details are missing or conflicting. | A human approves; solo override allowed and logged. | **Deterministic policy code is the only releaser**; the LLM can only emit an enum, and every outcome other than an affirmative confirmation, a passed challenge and a clean state diff keeps the hold (Q&A #14). |
| Evidence | Transcript, audio, audit log rows in the same DB. | Hash-chained log, PDF export (their core product). | Transcript PDF attached **to the Ramp bill** and a memo, so the evidence lives where the auditor looks. (Hash-chaining our audit rows is a cheap add if we want parity with CallbackProof.) |
| Evals | 79 emails / 20 transcripts, self-described as light on hard cases. | None found. | **Having an eval set is not a differentiator** (Trouvé has one). What would be: an adversarial set aimed at the policy invariants (voicemail, IVR, "I think so", transfers, spoken prompt injection, phone changed in the same window) with a headline of "0 unsafe releases across N cases". *Only claim the numbers the team actually measured.* |

**Honest residual points:** (1) the category is crowded at the idea level: Trouvé, nsKnox (AI Agent Caller, July 2026), Eftsure (human callbacks), Trustpair and AppZen all touch it; (2) Trouvé is a weekend prototype with no license and no visible adoption, so I would treat it as evidence that the idea is natural, not as a competitor; (3) CallbackProof is adjacent, not competing: it sells the *record* of a human callback to bookkeepers, while we automate the callback inside a payment platform, and its existence plus price is a useful demand signal (Section 6); (4) originality is 10% of the score per `00-context.md`, so the pitch should lead with the Ramp-native integration and the fail-closed design, not with "an AI that calls vendors".

**Say-this (15 seconds):** "Holding a payment and calling the vendor is a known control, and a few teams have prototyped it. What we built is the part that makes it safe to run on Ramp: it acts through Ramp's real hold and release API, it only dials a number with provenance that predates the request, it asks a question an impostor can't answer, and only deterministic policy, never the model, can release money."

---

## 3. Verifying the pitch stats

### 3.1 Verdicts

| Pitch line | Verdict | Primary source and exact wording |
|---|---|---|
| "Business email compromise hit about three in four organizations in 2025" | **Correct, with a footnote.** | AFP press release, **April 14, 2026**: "About three in four organizations (74%) were affected by business email compromise (BEC) in 2025." (2026 AFP Payments Fraud and Control Survey, Jan 2026, **n=465** treasury practitioners, underwritten by Truist.) Key Highlights: "BEC affected 74% of organizations in 2025, representing a significant increase from 2023 and 2024." **Footnote:** AFP's *own* "Sources of attempted/actual payments fraud" table shows BEC at **70%** and AFP's 2026-07-22 article says "cited by 70% of AFP survey respondents". A judge may quote 70%. Safe spoken form: "AFP's 2026 survey: about three in four, 74%". |
| "only 22% of organizations got back 75% or more of what they lost in 2024" | **Accurately quoted from the 2025 survey, but stale and loosely worded. Replace it.** | AFP press release, **April 15, 2025** (2025 survey, n=521, data for 2024): "Twenty-two percent of organizations were able to recover 75% or more of the funds lost due to payments fraud in 2024. This is a sharp decrease from 2023 when 41% of organizations recovered the same amount. However, 58% of organizations were able to recoup up to 75%..." Problems: (1) **superseded** by AFP 2026 (data for 2025): "the largest share of organizations which experienced payments fraud in 2025 report recovering **more than 75% of lost funds (30%), 20% report recovering none. The remaining 50% report partial recovery.**" (2) Denominator is organizations **that experienced payments fraud**, not all organizations. (3) AFP is internally inconsistent on "75% or more" (press release) vs "more than 75%" (Key Highlights). (4) Pitch pairs 2025 BEC data with 2024 recovery data. (5) "mostly gone" overstates: half got partial recovery. |

**Recommended replacement lines**
- Spoken (current, accurate): "In AFP's latest survey, only three in ten companies hit by payments fraud got back most of what they lost, and one in five got nothing back."  (AFP 2026: 30% recovered >75%; 20% none.)
- If you want to keep the dramatic 2024 number, date it and fix the base: "In 2024, only 22% of the companies that lost money to payments fraud recovered 75% or more." (AFP 2025.)
- Keep the BEC line as is, add the source tag: "(AFP 2026 survey)". On the slide, footnote both with the AFP URLs.

### 3.2 Additional sourced stats (use 3-5; ranked by Q&A utility)

1. **FBI IC3 2025 Annual Report** (primary PDF, https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf): BEC = **24,768 complaints, $3,046,598,558 losses** in 2025 (2024: 21,442 complaints, $2,770,151,146; so losses +10%, complaints +16%). BEC is the **#2 cyber-enabled fraud by loss** behind investment ($8.65B). **Average per complaint ≈ $123,000** (my division; IC3 does not print it). IC3's own BEC definition now includes compromise of "phone numbers and virtual meeting applications". **Do not use** the AFP July 2026 article's claim that BEC is "roughly $30 billion annually": it is off by about 10x against IC3. IC3 also reports AI-nexus BEC losses over $30 million in 2025 (that is probably where the "30" came from).
2. **Callback is the most-trusted control and it is already near-universal, which is exactly our thesis (the control exists, it is skipped).** AFP 2026 Key Highlights, "Effectiveness of policies and procedures to prevent BEC": "Verifying fund transfer requests by calling an authorized contact at the payee organization using a phone number from official records, not from email": **94% implemented; of those, 63% very effective, 31% effective, 6% somewhat effective.** "Established policies to verify changes to invoices, bank deposits and contact details": **96% implemented; 58% very effective.** Caveat: these are practitioner **ratings**, not a measured "share of fraud stopped". **I found no published stop-rate for callbacks, and no statistic on how often callbacks are skipped.** The "gets skipped" claim in the pitch is currently supported only by anecdotes (AFP 2026 respondent: bank details "entered into the system before Treasury could confirm the same"; another: "AP called the number on the email to confirm the banking details").
3. **Vendor impersonation is rising.** AFP 2025: vendor impostor fraud **45% of organizations in 2024, up 11 points** (from 34%); "Third-party impersonations, reported by 63% of respondents, remained the most frequent type of BEC scam." AFP 2026: "Fraudsters primarily impersonate vendors or executives to request changes to payment instructions"; **39%** of organizations "continue to receive genuine emails that have been intercepted by fraudsters" (thread hijack: why "same email thread" proves nothing).
4. **Phone is not pristine either, and the deepfake threat is real but small today.** AFP 2026: **30%** of organizations targeted by fraudulent phone calls (many "attempts to change bank account details"); **7%** report a deepfake attempt. AFP article 2026-07-22: "Only **6%** of survey respondents reported a confirmed deepfake-related incident, but **40%** said they were unsure." Same article: the defensive move "is to build procedures that require verification through channels and methods that are harder to fake, such as **an independent call to a known number**, a recorded video session or a physical confirmation."
5. **Recovery, FBI view:** IC3 Recovery Asset Team Financial Fraud Kill Chain 2025: **3,900 incidents, $1.16B attempted theft, $679M frozen, 58% success rate** (all fraud types; BEC was historically the majority, but 2025 saw a rise in tech-support/ATO). Freezing works when you report fast; prevention beats recovery.
6. **Prevalence:** AFP 2026: **76%** of organizations experienced attempted or actual payments fraud in 2025; only **17%** use AI to fight it. Nacha: B2B ACH grew about **10%** in 2025 to ~8.1B payments (35.2B total network payments, $93T).
7. **Ramp-reported (cite as such):** >$1M flagged in 90 days (early access, Oct 2025); $5M+ before approval (Ramp blog, 2026-05-29). Ramp PR also cites "79% of businesses experienced payment fraud in the past year" (that is AFP 2025's 79%).

---

## 4. Regulation and "why now"

### 4.1 Nacha 2026 fraud-monitoring rules (primary: nacha.org)

Sources: https://www.nacha.org/rules/risk-management-topics-fraud-monitoring-phase-2 (accessed 2026-11-09), Phase 1 page, "Tips for Originators to Comply with the 2026 Risk Management Rules" (2025-12-12), "The New Nacha Rules" (2026-06-04), "Practical Steps for Corporate Payment Practitioners to Reduce Credit-Push Payments Fraud" (**2026-10-28**).

- **Who:** each ODFI, each **non-consumer Originator** (any business sending ACH, including nonprofits and government), each Third-Party Sender, and each Third-Party Service Provider performing ACH functions. RDFIs have a parallel **credit monitoring** duty.
- **Phases:** **Phase 1: March 20, 2026**: all ODFIs and Originators/TPSs/TPSPs with >6 million ACH entries in 2023 (RDFIs >10 million receipts). **Phase 2: effective June 19, 2026** (all other non-consumer Originators/TPSs/TPSPs, no volume threshold), and since June 19 is a federal holiday "the practical effective date... will be the next banking day: **Monday, June 22, 2026**." (Nacha's own 2026-06-04 blog says "June 20" in one place; use Nacha's rule page.)
- **What is required:** "establish and implement **risk-based processes and procedures**, relevant to the role it plays in the authorization or Transmission of Entries, that are reasonably intended to identify Entries that are suspected of being unauthorized or **authorized under False Pretenses**; and review (**at least annually**) these processes and procedures and make appropriate updates."
- **False Pretenses (Nacha Operating Rules Art. 8 §8.42):** "the inducement of a payment by a Person misrepresenting (a) that Person's identity, (b) that Person's association with or authority to act on behalf of another Person, or (c) the ownership of an account to be credited." Nacha: this "covers common fraud scenarios such as Business Email Compromise (BEC), **vendor impersonation**, payroll impersonation, and other payee impersonations". Excludes fake/non-existent/poor-quality goods.
- **What it does NOT require (Nacha FAQ):** no prescribed method ("No."), no individual screening of every entry, **no pre-processing monitoring** ("the rules do not require such monitoring to be performed prior to processing Entries"), and **no change to liability allocation** (UCC 4A rights untouched).
- **Nacha names our control explicitly.** FAQ: "Originators may be best placed to... Such procedures could include **change controls regarding payment information and instructions for vendor and payroll payments**." Tips (2025-12-12): "**Out-of-Band Authentication** - Authenticate payment requests or changes to payment instructions by independently verifying the request/change using a method other than the method used by the original request. For example, if a vendor calls to request a change to their routing and account information for future payments, use contact information contained within your organization's internal database to contact the vendor via phone or email." Also "Dual Controls", "Account Validation - ...assess new accounts and **changes on existing accounts**", and "Routine and Red Flag Reporting - transactions of existing customers to new accounts". Oct 2026 blog: "Establishing clear procedures for validating payment instruction changes. Verifying account information using trusted channels."
- **Two Ramp-blog claims I could NOT find in Nacha's rule pages (do not repeat):** (1) a mandatory "account verification before sending an ACH credit" for all originators with accepted methods and "records... retained for at least 2 years". Nacha's Phase 1/2 pages describe risk-based monitoring and mention account validation as a tool; the first-use account validation requirement Nacha's resource page mentions is for **consumer WEB debits**. (2) "Nacha is explicit that manual two-person approval alone is no longer sufficient" is not in the pages I read. Treat as Ramp's interpretation. If a Ramp judge cites their blog, nod and use Nacha's actual text.
- **Why this is our why-now:** since June 22, 2026 *every* business that originates ACH, including Ramp's whole customer base, must have **documented** risk-based processes for exactly this fraud, reviewed annually. A callback log with timestamp, number dialed, outcome, transcript is a ready-made artifact for that documentation. Frame it as "evidence", not "compliance guarantee".

### 4.2 Nacha / FBI on validating account-change requests (guidance, not rules)
- Nacha (above): out-of-band authentication using internal-database contact info.
- FBI IC3 PSA240911 (Sept 2024): "Use secondary channels and/or two-factor authentication to verify requests for changes in account information."
- Ramp help center: verified phone number, different channel.
- Nacha Phixius: payment information network for account validation (data-based complement).

### 4.3 Insurance: do social-engineering policies require callbacks?
**Partly, and policy-specific.** Evidence (law-firm and broker commentary; **I found no actual policy form text or specific carrier clause**):
- Ward and Smith (2026-07-07): social engineering endorsements "come with significant limitations": **low sublimits ("Common ranges are between $25,000 and $250,000")**, and "**Verification requirements:** Some endorsements condition coverage on the policyholder having followed specified verification procedures before processing the transfer, like **calling back a known phone number** to confirm the request, requiring dual authorization for transfers above a specified amount, or verifying changes to vendor banking information through an independent channel. If the policyholder did not follow these procedures, the insurer may deny the claim." Also "narrow definitions" that can exclude voice deepfakes.
- Grandbay / insura.ai / Brown & Brown (via search): verification written as a condition precedent, a warranty above a dollar threshold, or a premium credit; denials where the number called was **the one in the spoofed email** ("verbal verification failure" exclusion, single secondary source).
- **Claim you can make:** "Many social-engineering endorsements condition coverage on documented callback verification to a number you already had; a call to the number in the scam email is the classic denial." **Do not claim** "insurance requires callbacks".

### 4.4 Internal-control framing (SOX / segregation of duties)
Practitioner sources only (SAP SOX baseline control P2P-01 "Vendor master changes require dual approval"; Stampli; Trustpair; none is PCAOB/COSO text): vendor-master bank-detail changes are a standard key control: **dual control** on bank fields, **separate requester, verifier and approver**, callback to a number held **before** the request, retained evidence (request, who was called and which number, reviewer, timestamps). CounterCall maps to: requester = email/Ramp change, verifier = agent (non-human, different from AP clerk), approver = policy engine + human for high value. Phrase as "supports the control", **[UNVERIFIED] against any auditor standard**.

---

## 5. Judge Q&A prep (21 questions, 2-3 sentence answers)

Tone: concede real limits quickly; the credibility win is naming the residual risk before they do.

1. **"Doesn't Ramp already do this?"** Ramp detects and alerts; its own help center then says to confirm "through a separate communication channel" using "a verified phone number", and that call is manual. We automate that one step and write the outcome back as evidence, and we haven't seen Ramp ship an outbound verification call (Ramp doesn't disclose all its methods, so we can't be sure). We complement the fraud agent; we don't replace it.

2. **"Why isn't this a feature Ramp ships in a week?"** The call is the easy part; the hard parts are the trust anchor (number provenance), a fail-closed state machine for voicemail/IVR/transfers/"I think so", consent and recording law, and carrying liability for a voice agent dialing your customers' vendors. Ramp could build or buy it, and a Ramp-native version would be the right end state; nsKnox shipped one in July 2026, so the category is real. Our hackathon contribution is the design and a working reference on Ramp's own API.

3. **"The on-file number is wrong or stale."** Then the system fails closed: the bill stays held and a human gets a task with the alternative: an independently sourced number (contract, W-9, vendor's own site). The agent never dials a number from the email. We track `first_seen_at`, `source` and `last_verified_at` for every number; a number with no history is "unverified" and routes to a human.

4. **"The scammer also changes the phone number."** That is the main attack, so a contact change is treated as part of the same change request. Ramp's contacts API only returns the *current* phone with no history, so we snapshot the number before any change window and dial the oldest-provenance number, never the new one. A phone change in the same window raises severity and forces human review.

5. **"Deepfake voice defeats a callback."** A callback tests possession of the vendor's real phone line, not the sound of a voice, so the attacker has to compromise the line *and* clone the voice. We never treat voice as a credential: the agent needs a clear, request-specific answer, and anything else holds. Residual risk is a compromised line plus a good clone (SIM swap, call forwarding); for large amounts we require a human callback or a second channel. Context: AFP 2026 puts deepfake attempts at 7% of organizations.

6. **"Traceless says callbacks are dead because the attacker controls the callback path."** They are right that a callback to a planted number is worthless, which is why we dial only a number whose provenance predates the request. Passkey or SSO verification is stronger but only works for vendors enrolled in it; the phone reaches every vendor with no enrollment. We see them as layers, and Nacha lists out-of-band authentication and account validation as separate controls.

7. **"False positives and alert fatigue?"** We only open a case on an actual bank-detail change or a first payment to a new account, not on every invoice, and the cost of a false positive is a roughly 2-minute automated call and a short hold, not a staffer's afternoon. We track clear-without-human rate and false-hold rate as the two product metrics. Ramp's own alerts are yellow/red; we only consume the high-risk class by default.

8. **"Latency versus payment-run cutoffs?"** The hold is placed **before** the call, so a slow or failed call means a late payment, never a wrong one. Ramp lists ACH delivery as typically 2-5 business days, so a same-day verification is usually inside the window. We schedule calls inside the vendor's local business hours and retry on a fixed schedule; the hold persists until a human decides.

9. **"Cost per call?"** Telephony is about $0.014/min on Twilio; voice-agent platforms quote roughly $0.08-$0.36/min all-in in 2026 (blog sources, they vary). A 2-3 minute verification with a retry is on the order of $0.50-$1.50, versus 10-15 minutes of a loaded AP salary for a human callback (my estimate, not a measured benchmark). Pricing hypothesis in Section 6; exact numbers belong to `01-voice-agent.md`.

10. **"Why voice and not an email or portal confirmation?"** Email is the compromised channel (AFP: 39% receive genuine intercepted emails, 85% receive spoofed ones), and portals only cover enrolled vendors and can be phished themselves. Phone is the one channel every vendor already has and the attacker does not control by default; the FBI, Nacha, AFP and Ramp all point to a separate channel or known number.

11. **"International vendors, languages, time zones?"** v1 scope: US numbers, English, vendor-local business hours; everything else routes to a human task, never to "probably fine". Multilingual agents are feasible (nsKnox advertises them) but we don't claim it. Our state machine already carries timezone and a "cannot verify automatically" outcome.

12. **"Recording and privacy?"** The agent discloses at the start that it is an automated assistant and that the call is recorded, and we store audio and transcript with a retention limit. The agent never asks for or speaks a full account number; at most the last four digits, which is all Ramp's API exposes anyway. Consent rules by state and AI-voice rules are covered in `01-voice-agent.md`; I did not verify them here.

13. **"What can your token do if it leaks?"** Honestly more than hold/release: Ramp's `bills:write` scope is "create, update, and pay bills" and there is no hold-only scope. We mitigate with a dedicated app and token, an interface that only exposes hold/release/attach, no approval endpoints existing in the API, secret rotation (Ramp audit-logs client secret rotation), and by logging every call. Wanting a narrower scope is a concrete feedback item for Ramp's platform team.

14. **"What is the LLM trusted to do?"** Nothing that moves money. The model classifies an email, holds the conversation inside a fixed script, and summarizes; its only tool on the call is `report_outcome(enum)`. **Deterministic policy code** is the only thing that can call `release`, and any outcome outside "vendor affirmatively confirms the change" resolves to *stay held*.

15. **"Prompt injection?"** Email and call audio are untrusted data. The classifier output is schema-constrained with no tool access, email text never enters the voice agent's prompt except as structured fields (vendor, change type), and the voice agent cannot be talked into a release because its only output is an enum that policy code then checks against other facts. We also scan inbound mail (AgentMail's Agent Armor, see `raw/am_armor.md`).

16. **"What if the scammer answers the real phone?"** That means the attacker has compromised the vendor's actual line, a much harder attack than email spoofing, and still not enough: the agent asks a challenge only the real AP contact knows (e.g., the last invoice number or PO, never an account number), and high-value changes require a human second channel. We say this out loud: it is a layered control that raises cost, not an oracle.

17. **"How does a vendor hold interact with Ramp's own approvals?"** Vendor hold and release can return **202 pending approval** inside Ramp. We treat 202 as "hold requested, not effective", immediately also hold each open bill (200), and alert a human. We never bypass Ramp's approval policies and the API has no way to approve a vendor-edit proposal anyway.

18. **"Ramp has no bank-change webhook. How do you detect changes?"** Two independent triggers. Our email classifier fires on the request itself, before anyone edits Ramp, and `vendors.updated` / `bills.updated` / `bills.created` webhooks trigger a re-fetch and diff of `GET /vendors/{id}/accounts?include_pending=true`. Webhook payloads only carry the object id, so we never trust the payload; we re-read state and verify the signature against the raw body.

19. **"Why not just use Plaid, EWS or Phixius ownership validation?"** Ownership validation answers "is this account held by name X?", not "did the real vendor ask for this change?" A mule account under a look-alike LLC can pass a name match; Ramp itself says its ownership check "does not guarantee against fraud". We recommend both, as layers, and Nacha lists them as separate originator controls.

20. **"Scale: thousands of vendors?"** Work is event-driven per *change*, not per vendor, so a company with 1,000 vendors generates a handful of cases a week at most. The Ramp API limit is 200 requests per 10 s per IP, webhooks are acknowledged after a durable enqueue (unique on event id), and calls are bounded by Twilio concurrency. State is one table per concept in a hosted DB.

21. **"This already exists" (a hackathon repo, a callback-record product, nsKnox).** Agreed that holding a payment and calling the number on file is a known control, and we don't claim the loop as new. What we haven't found elsewhere in the ones we checked is the Ramp-native part and the safety design: real hold/release through the Developer API including the 202 path, a trusted-number table with provenance, and deterministic policy as the only thing that can release. The closest repo we found (Trouvé, SteelHacks XIII) keeps holds in its own database with no Ramp or AP integration and lets its judge's "confirmed" verdict approve the change; CallbackProof documents a human's callback but doesn't call, hold or integrate. Tone: credit them (Trouvé's policy-not-score hold and eval set are good), don't disparage; see 2.6 and only claim differentiators the build actually ships.

Bonus (if asked): **"Who is liable if you wrongly clear a fraud?"** The product is a control that produces evidence, not an insurer; Nacha's rule explicitly doesn't change liability allocation, and we don't claim to. Higher-value or ambiguous cases always go to a human.

---

## 6. One-slide business case

**Buyer:** Controller / VP Finance at a mid-market company (roughly 20-500 employees) that pays vendors by ACH or wire through Ramp. Champion: AP manager who is skipping callbacks. Blocker/stakeholder: internal audit and the insurance broker. Channel: Ramp integrations marketplace (via the Authorization Code partner path in 1.4, a multi-approval process with no stated SLA).

**Pitch line:** "$4 per verified bank change, versus an AP clerk's afternoon, versus six figures when it goes wrong."

**Pricing hypothesis (all **[HYPOTHESIS]**):**
- Usage: **$3-5 per completed verification** (a "completed" call reaches a human or resolves to a human task). Option B: **$199/month platform fee including 50 verifications**, then $3 each.
- **Nearest priced comparable: CallbackProof, $99/mo (25 clients) and $199/mo (unlimited clients), sold to bookkeeping firms** for *records* of human callbacks (own website, [SINGLE-SOURCE], accessed 2026-11-09). It sets the floor for what a small buyer pays for the evidence layer alone and makes Option B ($199/mo) look in-market; our price is higher per case because we also make the call and hold the payment.
- Anchors: micro-deposit verification about $0.75-$1 and instant account verification about $1.50 per check (illustrative, from a vendor blog, [SINGLE-SOURCE]); incumbent platforms "custom", an unverified blog guess of **$12k-$100k+/year**; BEC average loss per IC3 complaint **≈ $123k**; Ramp's competitor nsKnox pricing not public. At $4, one prevented average BEC pays for about **30,000** verifications.
- COGS: about $0.50-$1.50 per verification (Q&A #9) so roughly 65-90% gross margin at $4. [estimate]

**TAM sketch (inputs sourced, multipliers are assumptions):**
- Ramp-channel beachhead: **85,000 customers** (Ramp, Oct 2026); assume 20% adopt a verification add-on at **$1,200/year** (about $100/month) = **~$20M**. Attach rate is an assumption; Ramp does not disclose Bill Pay customer count (only that Bill Pay "tripled payment volume and doubled customers" YoY as of Oct 2025).
- Broader US ceiling: **~657,000 employer firms with 20-499 employees** (my derivation from Census SUSB shares: 6,395,635 employer firms, 89.4% under 20, 99.7% under 500; treat as approximate) x $1,200-$3,600/year = **~$0.8B-$2.4B** serviceable ceiling if every firm adopted. Real SAM much lower (needs ACH/wire AP volume and an AP process).
- Regulatory pull: **every** non-consumer ACH originator, regardless of size, had to have documented risk-based fraud processes by **June 22, 2026** (Nacha Phase 2), reviewed annually. B2B ACH is ~8.1B payments/year and growing ~10%.
- Moat honesty: a Ramp-native version could erase this (acquihire or build); incumbents (nsKnox) have shipped voice. The defensible bits are the fail-closed policy engine, trust-anchor provenance model, evidence format, and distribution inside Ramp.

**Slide skeleton:** left = problem stat (AFP 2026: 74% BEC; 30% recovered most; 20% nothing), middle = flow (email -> hold in Ramp -> call -> release/keep), right = price + TAM line + "Ramp flags it. CounterCall confirms it."

---

## 7. Hand-offs

### 7.1 Architect: data model aligned to Ramp shapes
All Ramp ids are UUID strings. Money = integer minor units + `currency_code` (Ramp `CurrencyAmount`). Timestamps ISO-8601 UTC. SQLite-class types shown loosely.

```
vendor
  id (local pk)            ramp_vendor_id UUID UNIQUE      name        legal_name?     country(2)
  ramp_approval_status ('APPROVED'|'PENDING'|'REJECTED')   is_active   created_at   synced_at

trusted_contact                       -- OUR table; Ramp has no history/provenance
  id            vendor_id           phone_e164            label (e.g. "AP main line")
  source        ENUM('onboarding_w9'|'contract'|'ramp_contact_at_import'|'vendor_website'|'prior_verified_call'|'human_entered')
  ramp_contact_id UUID?             first_seen_at         last_verified_at?     last_verified_by ('call:<id>'|'human:<id>')?
  status        ENUM('trusted'|'quarantined'|'revoked')   quarantined_reason? superseded_by?
  RULE: dialable iff status='trusted' AND first_seen_at <= case.received_at - N days AND no phone change since.

bank_account_snapshot                 -- mirrors ApiVendorBankAccountResource
  id   vendor_id   ramp_account_id UUID   payment_method   currency   is_default
  last4 (nullable)  nickname?   status ('active'|'pending_approval'|'pending_deletion')   proposal_id UUID?
  first_seen_at   verified_at?   verified_by_call_id?    -- Ramp only gives last4; never store full numbers

change_case                           -- one per detected change request (the state machine)
  id  vendor_id  source ('email'|'ramp_webhook'|'audit_log')  email_message_id?  ramp_event_id?
  detected_at   claimed_new_last4?   ramp_proposal_id?   phone_change_flag bool
  severity ('low'|'high')   state ENUM(detected, held, calling, awaiting_human, verified_legit, blocked_fraud, expired)
  closed_at?   closed_by ('policy:<rule>@<ver>'|'human:<id>')

bill_ref                              -- mirrors Ramp Bill subset
  ramp_bill_id UUID PK   vendor_id   invoice_number   amount_minor   currency_code   payment_method
  payment_date?   vendor_account_id UUID?   approval_status   ramp_status_summary (mirror of Bill.status_summary)

hold                                  -- OUR record of what we asked Ramp to do (idempotent)
  id  case_id  scope ('vendor'|'bill')  ramp_object_id UUID
  state ENUM('requested'|'applied'|'pending_ramp_approval'|'released'|'release_pending_approval'|'failed')
  reason  requested_at  applied_at?  http_status (200|202|204|4xx)  released_at?  released_by ('policy:<rule>@<ver>'|'human:<id>')?

call
  id  case_id  trusted_contact_id  twilio_sid  started_at  ended_at
  disclosed_ai_and_recording bool  outcome ENUM(vendor_confirms_change, vendor_denies_change, unclear, no_answer, voicemail, transferred, wrong_party, refused)
  transcript  recording_ref  summary  challenge_passed bool?

policy_decision                       -- the ONLY writer of 'release'
  id  case_id  inputs_json  rule_id  version  decision ENUM(keep_hold, release, escalate_human)  decided_at

human_task   id case_id reason assignee due_at resolved_at resolution
webhook_event  ramp_event_id (UNIQUE, idempotency)  type  object_id  business_id  received_at  signature_ok  processed_at
ramp_call_log  id  mode ('mock'|'sandbox'|'prod')  method  path  status  at  case_id?   -- feeds the dashboard "Ramp API" panel
```
Rules for the architect: (1) hold is persisted as `requested` **before** the Ramp call and the call is retried idempotently; (2) vendor-hold 202 triggers bill-level holds; (3) release requires `policy_decision.decision='release'`, never an LLM output; (4) after a vendor release, bills must be re-scheduled by a human or Ramp (Ramp doc); (5) store full webhook raw body for signature re-verification.

### 7.2 Voice agent (01)
- Outcome enum above; script must obtain an **affirmative** statement; anything else is `unclear`.
- Dial only `trusted_contact` with status trusted; the call must **not** speak or request a full account number (last 4 at most). nsKnox's design asks the payee to confirm last digits of a known account; ours should prefer a request-specific challenge (invoice/PO), see Q&A #16.
- Disclosure at start: automated + recorded.
- Cost basis: telephony about $0.014/min (Twilio, third-party sources, Aug-Oct 2026); recording $0.0025/min; Twilio ConversationRelay adds $0.07/min of active AI session. Platform all-in $0.08-$0.36/min.

### 7.3 Email detection (02)
- Emit `change_case` with `source='email'`, `email_message_id`, extracted `claimed_new_last4` (never full number in logs), and any phone number in the email as **untrusted**.
- Hard rule: phone numbers parsed from email must never reach `trusted_contact`.
- AFP: look-alike domains reach "more than half" of organizations; same-thread hijack: 39%. Include `reply-to != from`, lookalike-domain, and new-domain signals as deterministic features.

### 7.4 App UI (05) and demo/video (06, 07)
- Show a **MOCK / SANDBOX** badge and the live `ramp_call_log` as the "Ramp API" panel; narration lines in 1.7 are literally accurate in both modes.
- Show the fallback visual for Ramp's **202 pending approval** path (hold requested, bills held individually).
- Show the **Ramp Audit Log** line item (actions are attributed to the app creator in Ramp's audit log): `Vendor placed on hold`.
- Visual for the phone-change trick: "Phone number changed 2h ago; dialing the number from 14 months ago."
- Stats slide: use Section 3 replacement wording and cite AFP URLs.
- Prior art (2.6): do not pitch "AI that calls vendors" as novel (Trouvé, nsKnox exist). Lead with Ramp-native hold/release, trust-anchor provenance, the knowledge challenge, and policy-only release. Each of those must be visible in the demo or the repo before it is claimed; if the build lacks one (e.g. the challenge), drop it from the pitch rather than overclaim.

### 7.5 First-hour checklist once sandbox is live
`POST /token` (scopes) -> `GET /entities` -> seed vendor/contact/account/bill (1.5) -> `POST /webhooks` + verify -> `POST /webhooks/mock-webhook-event {event_type:"vendors.updated", object_id:<vendor>, object_metadata:{}}` -> `POST /vendors/{id}/hold` (note 204 vs 202) -> `GET /bills/{id}` (note `status_summary`) -> `POST /vendors/{id}/release` -> check what Ramp's audit log shows. Update the UNVERIFIED notes in `lib/ramp.ts`.

---

## Appendix A: Source list (accessed 2026-11-09)

Ramp primary: raw/ramp_openapi.json; raw/ramp_llms-guides_*.txt; https://docs.ramp.com/developer-api/v1/sandbox-access (rendered); https://support.ramp.com/accessing-the-developer-api; https://support.ramp.com/bill-pay-fraud; https://support.ramp.com/vendor-verification; https://support.ramp.com/ramp-vendor-network; https://support.ramp.com/ap-agents-available-in-ramp-bill-pay; https://ramp.com/blog/accounts-payable/invoice-fraud; https://ramp.com/blog/agentic-ai/best-ai-agents-for-ap-automation; https://ramp.com/blog/2026-nacha-rule-changes; https://www.prnewswire.com/news-releases/ramp-launches-agents-for-ap-to-automate-accounts-payable-302576975.html (2025-10-07); https://docs.ramp.com/llms-guides/rate-limiting.txt; https://techcrunch.com/2026/10/15/ramp-reaches-60b-valuation-as-it-pushes-deeper-into-ai/.
Stats: AFP 2026 press release https://www.financialprofessionals.org/about/learn-more/press-releases/Details/over-75-percent-of-us-firms-experienced-payments-fraud-in-2025-while-ai-adoption-for-fraud-mitigation-lags ; 2026 Key Highlights PDF https://www.truist.com/content/dam/truist-bank/us/en/documents/info/cci/2026-afp-payments-fraud-control-survey-report-key-highlights.pdf ; AFP 2025 press release https://www.financialprofessionals.org/about/learn-more/press-releases/Details/survey-79-percent-of-organizations-were-victims-of-attempted-or-actual-payments-fraud-activity-in-2024 ; 2025 Key Highlights PDF https://www.truist.com/content/dam/truist-bank/us/en/documents/info/cci/2025-afp-payments-fraud-control-survey-report-key-highlights.pdf ; AFP article 2026-07-22 https://www.financialprofessionals.org/training-resources/resources/articles/Details/from-bec-to-deepfakes-payments-fraud-is-only-getting-more-sophisticated ; FBI IC3 2025 report https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf ; IC3 PSA240911.
Regs: https://www.nacha.org/rules/risk-management-topics-fraud-monitoring-phase-2 ; .../phase-1 ; https://www.nacha.org/news/tips-originators-comply-2026-risk-management-rules ; https://www.nacha.org/news/practical-steps-corporate-payment-practitioners-reduce-credit-push-payments-fraud ; https://www.nacha.org/news/new-nacha-rules-new-fraud-compliance-responsibilities-all-organizations-sending-ach-payments ; https://www.nacha.org/news/same-day-ach-and-business-business-payments-propel-ach-network-volume-growth-2025 ; https://www.nacha.org/content/phixius.
Competitors: https://github.com/Connor-W-Cahill/callback (Trouvé, SteelHacks XIII; commit 2b902a8, cloned and read 2026-11-09) ; https://callbackproof.com/ and https://callbackproof.com/resources/the-independent-contact-rule-explained ; https://nsknox.net/ai-agent-caller/ ; https://www.patechlabs.com/news/nsknox-voice-ai-agent-vendor-callbacks ; https://traceless.com/learn/vendor-payment-fraud-and-why-verification-keeps-failing/ ; https://diopter.ai/solutions/vendor-impersonation ; https://help.bill.com/direct/s/article/360000009246 ; https://www.eftsure.com ; https://trustpair.com/blog/the-secure-vendor-bank-change-process/ (search summaries; site blocks curl) ; https://www.bottomline.com/us/paymode ; https://help.tipalti.com ; https://www.avidxchange.com/security/ ; https://plaid.com/docs/identity/ ; https://www.certos.com/product/verify-account.
Insurance and controls: https://www.wardandsmith.com/article/social-engineering-fraud-and-your-crime-policy-why-your-insurer-may-deny-the-claim-and-what-you-can-do-about-it (2026-07-07); https://www.sapsoxcontrols.com/sox_controls/P2P-01/ ; https://www.stampli.com/resources/vendor-bank-change-callback-protocol/.
Pricing: https://www.twilio.com/en-us/voice/pricing/us (via third-party summaries); voice-agent price roundups (Sept-Oct 2026, vendor blogs).

## Appendix B: Unverified / single-source register
- Sandbox "ready in about one minute", no review step: Ramp Help Center only; not tested.
- `X-Ramp-Signature` encoding (hex assumed); post-hold `status_summary` (`ON_HOLD` assumed); `payments.updated` semantics; mock release target state.
- nsKnox: vendor claims; GlobeNewswire page blocked, product page and a trade write-up read.
- Trouvé: read from a one-commit snapshot (README, `pipeline.py`, `voice/agent.py`, `db.py`, greps); not run; I did not read `judge.py` beyond its prompt line, so "model verdict with deterministic fallback" comes from the README. Hackathon outcome unknown. Repo owner and the sole committer (`MWilly26`) differ; irrelevant but noted. A handful of GitHub repo searches for other vendor-callback projects returned nothing, which is weak evidence of absence.
- CallbackProof: its own website only (plus a search summary); no independent reviews, customer counts or dates found.
- Trustpair, Paymode, Tipalti, Eftsure specifics: vendor-authored or search summaries; Coupa/Medius: nothing found.
- Insurance clauses: commentary only, no policy forms.
- SOX framing: practitioner sources only.
- Pricing, TAM multipliers, labor-minute assumptions: hypotheses. Census 20-499 firm count is my derivation.
- AFP effectiveness table: assumed to be distribution among organizations that implemented the control.
- 2026 Twilio/voice-agent prices: third-party blogs; Twilio page itself returned only a snippet.
