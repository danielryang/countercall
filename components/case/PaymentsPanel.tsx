// Frozen money. Hatching is the "frozen" pattern (survives greyscale and video compression); the amount sits on a paper chip so it stays legible. Ramp calls are labelled with the TRUE mode.
import { fmtCents } from '@/lib/selectors';
import type { CaseView } from '@/lib/reducer';

const MODE = { mock: 'RAMP MOCK', sandbox: 'RAMP SANDBOX', prod: 'RAMP' } as const;
const md = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function PaymentsPanel({ c }: { c: CaseView }) {
  if (!c.payments.length) {
    const freezing = c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS');   // the policy asked for a hold that has not been confirmed yet
    return <div className="label px-3 py-2 text-fg-muted">{freezing ? <>Freezing payments<span className="scan-dots" /></> : 'No open payments for this vendor'}</div>;
  }
  const released = !!c.release;
  return (
    <div>
      {c.payments.map((b) => (
        <div key={b.paymentId} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-dashed border-rule px-3 py-1.5 text-[13px] ${released ? '' : 'frozen'}`}>
          <span><span className="bg-surface px-1 font-mono">INV {b.invoiceNumber}</span><span className="ml-2 bg-surface px-1 text-fg-muted">due {md(b.dueDate)} · {b.rail}</span></span>
          <span className="bg-surface px-1 font-mono tabular-nums">{fmtCents(b.amountCents)}</span>
          <span className="label bg-surface px-1">{released ? 'Released' : b.state === 'applied' ? 'Held' : b.state === 'pending_ramp_approval' ? 'Held · pending' : 'Hold failed'}</span>
        </div>
      ))}
      {c.rampCalls.length > 0 && (
        <div className="label flex flex-wrap gap-x-4 px-3 py-1 text-fg-muted">
          <span className="text-fg">{MODE[(c.rampMode as keyof typeof MODE) ?? 'mock']}</span>
          {c.rampCalls.slice(-3).map((r) => <span key={r.seq} className="normal-case tracking-normal">{r.method} …/{r.path.split('/').slice(-2).join('/')} {r.status}</span>)}
        </div>
      )}
    </div>
  );
}
