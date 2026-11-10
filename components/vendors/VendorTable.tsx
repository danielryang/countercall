// The vendor directory: one row per vendor with the number we would call, where it came from, the bank on file and what is held right now.
// Presentational: rows and selection come from the caller.
import { SOURCE_LABEL, VENDORS } from '@/lib/copy';
import { fmtCents } from '@/lib/selectors';
import type { VendorEntry } from '@/lib/vendors';

const COLS = 'grid-cols-[minmax(0,1.5fr)_116px_minmax(0,1fr)_minmax(0,1.3fr)_48px_96px]';

export function VendorTable({ vendors, selectedId, onSelect }: { vendors: VendorEntry[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div role="table" aria-label={VENDORS.title} className="px-2 pb-2">
      <div role="row" className={`cap grid ${COLS} gap-x-3 border-b border-rule px-3 pb-2 pt-1`}>
        <span role="columnheader">{VENDORS.cols.vendor}</span>
        <span role="columnheader">{VENDORS.cols.number}</span>
        <span role="columnheader">{VENDORS.cols.source}</span>
        <span role="columnheader">{VENDORS.cols.bank}</span>
        <span role="columnheader" className="text-right">{VENDORS.cols.cases}</span>
        <span role="columnheader" className="text-right">{VENDORS.cols.held}</span>
      </div>
      {vendors.map((v) => {
        const p = v.contacts.find((c) => c.isPrimary);
        const selected = v.id === selectedId;
        return (
          <button key={v.id} type="button" role="row" aria-current={selected} onClick={() => onSelect(v.id)}
            className={`mt-1 grid w-full ${COLS} items-center gap-x-3 rounded-lg border px-3 py-2 text-left transition-colors duration-[var(--d-fast)] ${selected ? 'border-rule bg-surface' : 'border-transparent hover:bg-surface/60'}`}>
            <span role="cell" className="min-w-0">
              <span className="block truncate text-[14px] font-medium leading-5">{v.name}</span>
              <span className="block truncate text-[12px] leading-4 text-fg-muted">{v.domains[0]}</span>
            </span>
            <span role="cell" className="font-mono text-[13px] tabular-nums">{p ? p.phoneMasked : <span className="text-fg-muted">none</span>}</span>
            <span role="cell" className="min-w-0">
              <span className="block truncate text-[13px] leading-5">{p ? (SOURCE_LABEL[p.source] ?? p.source) : ''}</span>
              <span className="block truncate text-[12px] leading-4 text-fg-muted">{p ? `added ${p.addedAt.slice(0, 10)}` : ''}</span>
            </span>
            <span role="cell" className="min-w-0">
              <span className="block truncate text-[13px] leading-5">{v.bank?.bankName ?? <span className="text-fg-muted">none</span>}</span>
              <span className="block font-mono text-[12px] leading-4 text-fg-muted">{v.bank?.last4Masked ?? ''}</span>
            </span>
            <span role="cell" className={`text-right font-mono text-[13px] tabular-nums ${v.casesOpen ? '' : 'text-fg-muted'}`}>{v.casesOpen}</span>
            <span role="cell" className="text-right">
              {v.heldCents
                ? <span className="font-mono text-[13px] tabular-nums" style={{ color: 'color-mix(in oklab, var(--color-held) var(--chip-mix), var(--fg))' }}>{fmtCents(v.heldCents)}</span>
                : <span className="font-mono text-[13px] text-fg-muted">{'—'}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
