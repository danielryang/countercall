// One vendor, as a Ramp vendor page body: the pending-review banner when a bank-change request is on hold, the numbers on file (the one we call
// first) and the bank on file on the left, and a "Vendor details" list on the right. The title and breadcrumb come from the caller.
import { NumberOnFile } from './NumberOnFile';
import { VENDORS } from '@/lib/copy';
import { fmtCents } from '@/lib/selectors';
import type { VendorEntry } from '@/lib/vendors';
import type { ReactNode } from 'react';

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-1.5 text-[15px] leading-[22px]"><dt className="text-fg-muted">{k}</dt><dd className="min-w-0 break-words">{children}</dd></div>;
}

export function VendorFile({ v, onCases }: { v: VendorEntry; /** opens the case list (the banner's link) */ onCases?: () => void }) {
  const hasPrimary = v.contacts.some((c) => c.isPrimary);
  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px] gap-10">
      <div className="min-w-0 space-y-8">
        {v.casesOpen > 0 && (
          <div className="flex items-center gap-3 rounded-sm border border-banner-rule bg-banner px-5 py-3.5 text-[16px] text-banner-ink">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0"><path d="M10 2.8l7.6 13.4H2.4z" /><path d="M10 8v3.6M10 14v.1" /></svg>
            <span className="flex-1">A bank-change request for this vendor is on hold{v.heldCents ? ` (${fmtCents(v.heldCents)})` : ''}.</span>
            {onCases && <button type="button" onClick={onCases} className="shrink-0 underline underline-offset-4 hover:text-fg">View cases {'→'}</button>}
          </div>
        )}
        <section aria-label={VENDORS.numbers}>
          <h2 className="text-[22px] font-[450] leading-8">{VENDORS.numbers}</h2>
          <p className="mt-1 text-[15px] text-fg-muted">{VENDORS.intro}</p>
          <div className="mt-2">
            {!hasPrimary && <p className="py-3 text-[15px] text-fg-muted">{VENDORS.noNumber}</p>}
            {v.contacts.map((c) => <NumberOnFile key={c.id} c={c} />)}
          </div>
        </section>
        <section aria-label={VENDORS.bank}>
          <h2 className="text-[22px] font-[450] leading-8">{VENDORS.bank}</h2>
          {v.bank ? (
            <p className="mt-2 border-b border-rule pb-3.5 text-[16px]">{v.bank.bankName} <span className="font-mono text-fg-muted">({v.bank.last4Masked})</span>
              <span className="block text-[14px] text-fg-muted">On file since {v.bank.since.slice(0, 10)}</span></p>
          ) : <p className="mt-2 text-[15px] text-fg-muted">{VENDORS.noBank}</p>}
        </section>
        <p className="text-[14px] text-fg-muted">{VENDORS.readOnly}</p>
      </div>
      <aside>
        <h2 className="pb-3 text-[20px] font-[500]">Vendor details</h2>
        <dl>
          {v.legalName && <Row k="Legal name">{v.legalName}</Row>}
          <Row k="Domains">{v.domains.join(', ') || '—'}</Row>
          <Row k="Country">{v.country}</Row>
          <Row k="Scheduled"><span className="font-mono">{fmtCents(v.scheduledCents)}</span></Row>
          <Row k="On hold"><span className={`font-mono ${v.heldCents ? 'text-blaze-ink' : ''}`}>{fmtCents(v.heldCents)}</span></Row>
          <Row k="Cases"><span className="font-mono">{v.casesTotal}</span>{v.casesOpen ? <span className="text-fg-muted"> ({v.casesOpen} open)</span> : null}</Row>
        </dl>
      </aside>
    </div>
  );
}
