// lib/holds.ts: apply Ramp holds for a case. Bill level AND vendor level (a vendor hold can answer 202 pending). Fail closed:
// our `holds` row is written as `requested` BEFORE the Ramp call, and any failure is reported, never swallowed.
import type { EmittedEvent, HeldBill, RampMode } from './events';
import type { HoldClient } from './ramp.mock-db';
import type { Q } from './sink';

export interface HoldReport { bills: HeldBill[]; vendorHold: 'applied' | 'pending_ramp_approval' | 'failed' | 'skipped'; rampMode: RampMode }
export interface HoldDeps { q: Q; ramp: HoldClient; mode: RampMode; emit: (e: EmittedEvent) => Promise<unknown>; reason?: string }

type BillRow = { id: string; ramp_bill_id: string | null; invoice_number: string; amount_cents: string | number; currency: string; due_date: string | Date; payment_method: string };
const REASON = 'CounterCall: unverified bank-change request';
const dueOf = (d: string | Date) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

async function timed<T>(d: HoldDeps, caseId: string, method: string, path: string, okStatus: (r: T) => number, fn: () => Promise<T>): Promise<{ ok: boolean; result?: T; status: number }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    const status = okStatus(result);
    await d.emit({ type: 'ramp.call', caseId, mode: d.mode, method, path, status, ms: Date.now() - t0 });
    return { ok: true, result, status };
  } catch (err) {
    console.error('ramp call failed', method, path, err);
    await d.emit({ type: 'ramp.call', caseId, mode: d.mode, method, path, status: 599, ms: Date.now() - t0 });   // 599: transport/unknown failure, not an HTTP status from Ramp
    return { ok: false, status: 599 };
  }
}

export async function applyHolds(d: HoldDeps, caseId: string, vendorId: string, paymentIds: string[]): Promise<HoldReport> {
  const reason = d.reason ?? REASON;
  const rows = paymentIds.length
    ? await d.q<BillRow>(`select id, ramp_bill_id, invoice_number, amount_cents, currency, due_date, payment_method from bills where id in (select jsonb_array_elements_text($1::text::jsonb)) and vendor_id = $2 and paid_at is null order by due_date`, [JSON.stringify(paymentIds), vendorId])
    : [];
  const bills: HeldBill[] = [];

  for (const b of rows) {
    const ref = d.mode === 'sandbox' ? b.ramp_bill_id : b.id;
    await d.q(`insert into holds (case_id, scope, vendor_id, bill_id, state, reason) values ($1,'bill',$2,$3,'requested',$4) on conflict do nothing`, [caseId, vendorId, b.id, reason]);
    const r = ref ? await timed(d, caseId, 'POST', `/developer/v1/bills/${ref}/hold`, () => 200, () => d.ramp.holdBill(ref, reason)) : { ok: false, status: 0 };
    await d.q(`update holds set state = $1::hold_state, http_status = $2, applied_at = case when $1::text = 'applied' then now() end where case_id = $3 and scope = 'bill' and bill_id = $4`,
      [r.ok ? 'applied' : 'failed', r.ok ? r.status : null, caseId, b.id]);
    bills.push({ paymentId: b.id, invoiceNumber: b.invoice_number, amountCents: Number(b.amount_cents), currency: b.currency.trim(), dueDate: dueOf(b.due_date), rail: b.payment_method,
      rampBillId: b.ramp_bill_id, state: r.ok ? 'applied' : 'failed' });
  }

  let vendorHold: HoldReport['vendorHold'] = 'skipped';
  const [v] = await d.q<{ ramp_vendor_id: string | null }>(`select ramp_vendor_id from vendors where id = $1`, [vendorId]);
  const vref = d.mode === 'sandbox' ? v?.ramp_vendor_id : vendorId;
  if (vref) {
    await d.q(`insert into holds (case_id, scope, vendor_id, state, reason) values ($1,'vendor',$2,'requested',$3) on conflict do nothing`, [caseId, vendorId, reason]);
    const r = await timed(d, caseId, 'POST', `/developer/v1/vendors/${vref}/hold`, (x) => (x.kind === 'applied' ? 204 : 202), () => d.ramp.holdVendor(vref, reason));
    vendorHold = !r.ok ? 'failed' : r.result!.kind === 'applied' ? 'applied' : 'pending_ramp_approval';
    await d.q(`update holds set state = $1::hold_state, http_status = $2, applied_at = case when $1::text = 'applied' then now() end where case_id = $3 and scope = 'vendor'`,
      [vendorHold === 'failed' ? 'failed' : vendorHold, r.ok ? r.status : null, caseId]);
  }
  return { bills, vendorHold, rampMode: d.mode };
}

/** Anything that is not a clean hold must reach a human (fail closed). `expected` = how many scheduled bills the policy asked us to hold. */
export const holdProblem = (r: HoldReport, expected: number) =>
  r.bills.some((b) => b.state === 'failed') || r.vendorHold === 'failed' || r.bills.length < expected;
