// Frozen money. A hatched rail marks a frozen bill (a pattern, so it survives greyscale and video compression); the numbers stay clean.
// The Ramp line states the TRUE mode (mock or sandbox) and lists the exact calls on hover.
import { fmtCents } from '@/lib/selectors';
import type { CaseView } from '@/lib/reducer';

const MODE = { mock: 'Ramp mock', sandbox: 'Ramp sandbox', prod: 'Ramp' } as const;
const md = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function PaymentsPanel({ c }: { c: CaseView }) {
  if (!c.payments.length) {
    const freezing = c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS');   // the policy asked for a hold that is not confirmed yet
    return <div className="cap px-4 py-2">{freezing ? <>Freezing payments<span className="scan-dots" /></> : 'No open payments for this vendor'}</div>;
  }
  const released = !!c.release;
  return (
    <div className="px-4 pb-1">
      {c.payments.map((b) => (
        <div key={b.paymentId} className="flex items-center gap-3 py-1.5 text-[13px] leading-5">
          <i aria-hidden className={`w-3.5 shrink-0 self-stretch ${released ? 'bg-verified' : 'frozen border border-rule'}`} />
          <span className="flex-1"><span className="font-mono">INV {b.invoiceNumber}</span> <span className="text-fg-muted">due {md(b.dueDate)} {'·'} {b.rail}</span></span>
          <span className="font-mono tabular-nums">{fmtCents(b.amountCents)}</span>
          <span className="cap w-16 text-right">{released ? 'Released' : b.state === 'applied' ? 'Held' : b.state === 'pending_ramp_approval' ? 'Pending' : 'Failed'}</span>
        </div>
      ))}
      {c.rampCalls.length > 0 && (
        <div className="cap pb-1 pl-[26px]" title={c.rampCalls.map((r) => `${r.method} ${r.path} ${r.status}`).join('\n')}>
          {MODE[(c.rampMode as keyof typeof MODE) ?? 'mock']} {'·'} {c.rampCalls.length} API calls
        </div>
      )}
    </div>
  );
}
