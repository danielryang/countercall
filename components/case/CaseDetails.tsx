// The right-hand details of a case, in Ramp's vendor-page shape. The held amount leads, in Blaze, because it is the one number that must never be missed.
// The hold is a state that lasts until a person releases the money, so it lives here, beside every step, with when it started and the invoices it
// covers (each with the frozen hatch, green once released), rather than as a step on the timeline.
import type { ReactNode } from 'react';
import type { CaseView } from '@/lib/reducer';
import { fmtCents, mmss } from '@/lib/selectors';

const md = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-1.5 text-[15px] leading-[22px]"><dt className="text-fg-muted">{k}</dt><dd className="min-w-0 break-words">{children}</dd></div>;
}

export function CaseDetails({ c, heldAtMs }: { c: CaseView; /** when the hold landed, in ms after the email arrived */ heldAtMs?: number | null }) {
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  const held = cents > 0 && !c.release;
  const holding = !!c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS');
  const ramp = c.rampMode === 'sandbox' ? 'Ramp sandbox' : 'Ramp mock, no real money';
  return (
    <section>
      <h3 className="pb-3 text-[20px] font-[500]">Case details</h3>
      {cents > 0 ? (
        <div className="mb-3 border-b border-rule pb-3.5">
          <div className="text-[14px] text-fg-muted">{held ? 'On hold' : 'Released'}</div>
          {/* the held amount settles in when the hold lands (state change: payments frozen) */}
          <div className={`mt-0.5 font-mono text-[30px] font-[450] leading-9 tracking-[-0.01em] ${held ? 'slab-pour text-blaze-ink' : ''}`}>{fmtCents(cents)}</div>
          <div className="mt-1 text-[14px] text-fg-muted">
            {held ? `Held${heldAtMs != null ? ` since ${mmss(heldAtMs)}` : ''} \u00b7 ${ramp}` : `Released by ${c.release?.approvedBy ?? 'a person'} \u00b7 ${ramp}`}
          </div>
          <ul className="mt-3 space-y-1.5">
            {c.payments.map((b) => (
              <li key={b.paymentId} className="flex items-center gap-2.5 text-[14px] leading-5">
                <i aria-hidden className={`block h-4 w-4 shrink-0 rounded-sm ${c.release ? 'bg-verified' : 'frozen border border-signal'}`} />
                <span className="min-w-0 flex-1 truncate">Invoice {b.invoiceNumber} <span className="text-fg-muted">due {md(b.dueDate)}</span></span>
                <span className="font-mono">{fmtCents(b.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-3 border-b border-rule pb-3.5 text-[15px] text-fg-muted">{holding ? 'Putting the scheduled payments on hold\u2026' : 'Nothing is on hold.'}</p>
      )}
      <dl>
        <Row k="Case"><span className="font-mono">{c.id}</span></Row>
      </dl>
    </section>
  );
}
