// lib/ramp.mock-db.ts: the DB-backed mock Ramp. A serverless instance cannot keep state between webhook calls, so the mock lives in our own `bills` table
// (db/001_schema.sql: "in RAMP_MODE=mock this table IS the mock Ramp's database"). Same method names and JSON shapes as the real client.
import type { Q } from './sink';
import type { RampBill, RampClient, VendorHoldResult } from './ramp';

/** The only Ramp calls the product makes: block and unblock. There is no approve endpoint (03 section 0 #8). */
export type HoldClient = Pick<RampClient, 'holdBill' | 'releaseBill' | 'holdVendor' | 'releaseVendor'>;

type BillRow = { id: string; vendor_id: string; vendor_name: string; invoice_number: string; amount_cents: string | number; currency: string; due_date: string | Date; ramp_status_summary: string; payment_method: string };
const iso = (d: string | Date) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

const toBill = (r: BillRow): RampBill => ({
  id: r.id, amount: { amount: Number(r.amount_cents), currency_code: r.currency, minor_unit_conversion_rate: 100 }, invoice_number: r.invoice_number,
  issued_at: iso(r.due_date), due_at: iso(r.due_date), created_at: new Date(0).toISOString(), entity_id: 'rice-robotics', approval_status: 'APPROVED', status: 'OPEN',
  status_summary: r.ramp_status_summary as RampBill['status_summary'], vendor: { id: r.vendor_id, name: r.vendor_name }, vendor_contact_id: null, payment: null, archived_at: null,
});

const SELECT = `select b.id, b.vendor_id, v.name as vendor_name, b.invoice_number, b.amount_cents, b.currency, b.due_date, b.ramp_status_summary, b.payment_method
                from bills b join vendors v on v.id = b.vendor_id`;

export class DbMockRampClient implements HoldClient {
  constructor(private q: Q, private opts: { vendorHoldNeedsApproval?: boolean } = {}) {}

  private async setStatus(col: 'id' | 'vendor_id', ref: string, status: string): Promise<BillRow[]> {
    await this.q(`update bills set ramp_status_summary = $1 where ${col} = $2 and paid_at is null`, [status, ref]);
    return this.q<BillRow>(`${SELECT} where b.${col} = $1 and b.paid_at is null`, [ref]);
  }
  async holdBill(id: string): Promise<RampBill> {
    const [r] = await this.setStatus('id', id, 'ON_HOLD');
    if (!r) throw new Error(`ramp POST /bills/${id}/hold -> 404`);
    return toBill(r);
  }
  async releaseBill(id: string): Promise<RampBill> {
    const [r] = await this.setStatus('id', id, 'AWAITING_PAYMENT');   // UNVERIFIED target state in the real sandbox (03 section 1.6)
    if (!r) throw new Error(`ramp POST /bills/${id}/release -> 404`);
    return toBill(r);
  }
  async holdVendor(id: string): Promise<VendorHoldResult> {
    if (this.opts.vendorHoldNeedsApproval) return { kind: 'pending_approval' };   // the 202 path: also hold bill by bill
    await this.setStatus('vendor_id', id, 'ON_HOLD');
    return { kind: 'applied' };
  }
  async releaseVendor(id: string): Promise<VendorHoldResult> {
    if (this.opts.vendorHoldNeedsApproval) return { kind: 'pending_approval' };
    await this.setStatus('vendor_id', id, 'AWAITING_PAYMENT');
    return { kind: 'applied' };
  }
}
