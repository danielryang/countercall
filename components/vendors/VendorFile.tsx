// One vendor's file: the money scheduled and held, the numbers on file with provenance (the one we call first), and the bank account on file.
import { NumberOnFile } from './NumberOnFile';
import { VENDORS } from '@/lib/copy';
import { fmtCents } from '@/lib/selectors';
import type { VendorEntry } from '@/lib/vendors';

export function VendorFile({ v }: { v: VendorEntry }) {
  const hasPrimary = v.contacts.some((c) => c.isPrimary);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-4">
      <div>
        <h2 className="text-[16px] font-semibold leading-6">{v.name}</h2>
        <p className="cap">{[v.legalName, v.domains.join(', '), v.country].filter(Boolean).join(' · ')}</p>
        <p className="mt-2 text-[13px] leading-5" aria-label={VENDORS.money}>
          <span className="font-mono tabular-nums" style={v.heldCents ? { color: 'color-mix(in oklab, var(--color-held) var(--chip-mix), var(--fg))' } : undefined}>{fmtCents(v.heldCents)}</span> <span className="text-fg-muted">on hold</span>
          {' · '}<span className="font-mono tabular-nums">{fmtCents(v.scheduledCents)}</span> <span className="text-fg-muted">scheduled</span>
          {' · '}<span className="font-mono tabular-nums">{v.casesTotal}</span> <span className="text-fg-muted">{v.casesTotal === 1 ? 'case' : 'cases'}</span>
        </p>
      </div>

      <section aria-label={VENDORS.numbers} className="space-y-2">
        <h3 className="text-[14px] font-medium">{VENDORS.numbers}</h3>
        {!hasPrimary && <p className="text-[13px] leading-5 text-fg-muted">{VENDORS.noNumber}</p>}
        {v.contacts.map((c) => <NumberOnFile key={c.id} c={c} />)}
      </section>

      <section aria-label={VENDORS.bank} className="space-y-1">
        <h3 className="text-[14px] font-medium">{VENDORS.bank}</h3>
        {v.bank ? (
          <p className="text-[13px] leading-5">{v.bank.bankName} <span className="font-mono">{v.bank.last4Masked}</span>
            <span className="cap block">On file since {v.bank.since.slice(0, 10)}</span></p>
        ) : <p className="text-[13px] text-fg-muted">{VENDORS.noBank}</p>}
      </section>

      <p className="cap mt-auto">{VENDORS.readOnly}</p>
    </div>
  );
}
