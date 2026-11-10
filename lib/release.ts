// lib/release.ts: the ONLY path to `payment.released`. A person, never a model or a webhook, calls this through POST /api/cases/[id]/release.
// One transaction: lock the case, canRelease() (the policy gate), release every hold at Ramp, mark our holds released, append payment.released (which itself throws
// unless the state machine allows it). If Ramp fails, the transaction rolls back (the case stays held) and a payment.release_failed event records it.
import type { CaseState, EmittedEvent, RampMode, ReleaseDestination } from './events';
import { canRelease, isLegal } from './policy/lifecycle';
import type { HoldClient } from './ramp.mock-db';
import { appendEvent, type Q } from './sink';

export interface ReleaseIo {
  tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>;       // one transaction (postgres.js sql.begin, PGlite transaction)
  ramp: (q: Q) => HoldClient;                            // the mock bound to the transaction's q, or the sandbox client
  mode: RampMode;
  emit: (e: EmittedEvent) => Promise<unknown>;           // own transaction: used for the failure record after a rollback
}
export type ReleaseResult = { ok: true; paymentIds: string[] } | { ok: false; status: 404 | 409 | 502; reason: string };

class Refused extends Error { constructor(public status: 404 | 409, public reason: string) { super(reason); } }
type HoldRow = { scope: 'bill' | 'vendor'; bill_id: string | null; vendor_id: string; ramp_bill_id: string | null; ramp_vendor_id: string | null };

export async function releaseCase(io: ReleaseIo, caseId: string, approvedBy: string, destination: ReleaseDestination, note?: string): Promise<ReleaseResult> {
  try {
    return await io.tx(async (q) => {
      const [c] = await q<{ state: CaseState }>(`select state from cases where id = $1 for update`, [caseId]);
      if (!c) throw new Refused(404, 'case not found');
      const gate = canRelease(c.state, approvedBy, note, destination);
      if (!gate.ok) throw new Refused(409, gate.reason);

      const holds = await q<HoldRow>(
        `select h.scope, h.bill_id, h.vendor_id, b.ramp_bill_id, v.ramp_vendor_id
         from holds h join vendors v on v.id = h.vendor_id left join bills b on b.id = h.bill_id
         where h.case_id = $1 and h.state in ('applied', 'pending_ramp_approval') order by h.scope desc, h.bill_id`, [caseId]);
      const ramp = io.ramp(q); const paymentIds: string[] = []; const rampBillIds: (string | null)[] = [];
      for (const h of holds) {
        if (h.scope === 'bill') {
          const ref = io.mode === 'sandbox' ? h.ramp_bill_id : h.bill_id;
          if (!ref) throw new Error(`no Ramp reference for bill ${h.bill_id}`);
          await ramp.releaseBill(ref); paymentIds.push(h.bill_id!); rampBillIds.push(h.ramp_bill_id);
        } else {
          const ref = io.mode === 'sandbox' ? h.ramp_vendor_id : h.vendor_id;
          if (ref) await ramp.releaseVendor(ref);
        }
      }
      await q(`update holds set state = 'released', released_at = now(), released_by = $2 where case_id = $1 and state in ('applied', 'pending_ramp_approval')`, [caseId, approvedBy]);
      const seq = await appendEvent(q, { type: 'payment.released', caseId, paymentIds, rampBillIds, approvedBy, note: note?.trim() || null, destination }, approvedBy);
      if (seq === null) throw new Refused(409, 'already released');       // the idempotency key: a repeat is a no-op, not a second release
      return { ok: true as const, paymentIds };
    });
  } catch (err) {
    if (err instanceof Refused) return { ok: false, status: err.status, reason: err.reason };
    console.error('release failed', caseId, err);
    // the transaction rolled back: the payments are still held at Ramp and in our tables. Record the failure so it is visible.
    await io.emit({ type: 'payment.release_failed', caseId, paymentIds: [], error: 'Ramp could not release the payments' }).catch((e) => console.error('could not record release_failed', e));
    return { ok: false, status: 502, reason: 'Ramp could not release the payments. They are still held.' };
  }
}

export const NOTE_MIN_CLOSE = 5;
/** A human closes a case without releasing anything (a false alarm, or after handling it by hand). */
export async function closeCase(io: { q: Q; emit: (e: EmittedEvent, human?: string) => Promise<unknown> }, caseId: string, closedBy: string, note: string): Promise<{ ok: true } | { ok: false; status: 404 | 409; reason: string }> {
  if (note.trim().length < NOTE_MIN_CLOSE) return { ok: false, status: 409, reason: `a note of at least ${NOTE_MIN_CLOSE} characters is required` };
  const [c] = await io.q<{ state: CaseState }>(`select state from cases where id = $1`, [caseId]);
  if (!c) return { ok: false, status: 404, reason: 'case not found' };
  if (!isLegal(c.state, 'closed')) return { ok: false, status: 409, reason: `a ${c.state} case cannot be closed` };
  await io.emit({ type: 'case.closed', caseId, closedBy, note: note.trim() }, closedBy);
  return { ok: true };
}
