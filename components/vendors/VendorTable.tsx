// The vendor list, as a Ramp table: initials avatar + name + domain, the number we would call with where it came from, the bank on file, open cases and
// what is held right now. Hairline rows, muted sentence-case headers, amounts right-aligned. Presentational: rows and selection come from the caller.
import { Avatar } from '@/components/ui/Avatar';
import { SOURCE_LABEL, VENDORS } from '@/lib/copy';
import { fmtCents } from '@/lib/selectors';
import type { VendorEntry } from '@/lib/vendors';

export function VendorTable({ vendors, selectedId, onSelect }: { vendors: VendorEntry[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <table className="w-full border-collapse text-[15px]" aria-label={VENDORS.title}>
      <thead>
        <tr className="border-b border-rule text-left text-[13px] text-fg-muted">
          <th className="py-2.5 pl-4 font-[450]">{VENDORS.cols.vendor}</th>
          <th className="py-2.5 font-[450]">{VENDORS.cols.number}</th>
          <th className="py-2.5 font-[450]">{VENDORS.cols.bank}</th>
          <th className="py-2.5 pr-6 text-right font-[450]">{VENDORS.cols.cases}</th>
          <th className="py-2.5 pr-4 text-right font-[450]">{VENDORS.cols.held}</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((v) => {
          const p = v.contacts.find((c) => c.isPrimary);
          return (
            <tr key={v.id} onClick={() => onSelect(v.id)} aria-current={v.id === selectedId || undefined} className="cursor-pointer border-b border-rule hover:bg-surface-raised/50">
              <td className="py-3 pl-4">
                <span className="flex items-center gap-3">
                  <Avatar name={v.name} />
                  <span className="min-w-0">
                    <span className="block truncate leading-5">{v.name}</span>
                    <span className="block truncate text-[13px] leading-5 text-fg-muted">{v.domains[0] ?? ''}</span>
                  </span>
                </span>
              </td>
              <td className="py-3">
                <span className="block font-mono leading-5">{p ? p.phoneMasked : <span className="text-fg-muted">None on file</span>}</span>
                <span className="block text-[13px] leading-5 text-fg-muted">{p ? `${SOURCE_LABEL[p.source] ?? p.source}, ${p.addedAt.slice(0, 10)}` : ''}</span>
              </td>
              <td className="py-3">
                <span className="block leading-5">{v.bank?.bankName ?? <span className="text-fg-muted">None</span>}</span>
                <span className="block font-mono text-[13px] leading-5 text-fg-muted">{v.bank?.last4Masked ?? ''}</span>
              </td>
              <td className={`py-3 pr-6 text-right font-mono ${v.casesOpen ? '' : 'text-fg-muted'}`}>{v.casesOpen}</td>
              <td className="py-3 pr-4 text-right font-mono">{v.heldCents ? <span className="text-blaze-ink">{fmtCents(v.heldCents)}</span> : <span className="text-fg-muted">{'—'}</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
