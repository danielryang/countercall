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
