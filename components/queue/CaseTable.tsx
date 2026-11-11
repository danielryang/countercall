// The cases list, as a Ramp table: group rows ("Needs a person", "Working", "Resolved"), then one row per case with an initials avatar, the vendor and
// the email subject on two lines, a status pill, the amount on hold right-aligned, and a quiet action. Hairline dividers, no zebra, no uppercase headers.
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import type { CaseView } from '@/lib/reducer';
import { fmtCents, GROUPS, type QueueGroup } from '@/lib/selectors';

const NAME: Record<QueueGroup, string> = { 'NEEDS ACTION': 'Needs a person', 'IN PROGRESS': 'Working on it', RESOLVED: 'Resolved' };

export function CaseTable({ groups, selectedId, onOpen }: { groups: Record<QueueGroup, CaseView[]>; selectedId: string | null; onOpen: (id: string) => void }) {
  const any = GROUPS.some((g) => groups[g].length);
  if (!any) return <p className="border-y border-rule px-4 py-10 text-center text-[15px] text-fg-muted">No cases yet. Watching the inbox<span className="scan-dots" /></p>;
  return (
    <table className="w-full border-collapse text-[15px]">
      <thead>
        <tr className="border-b border-rule text-left text-[13px] text-fg-muted">
          <th className="py-2.5 pl-4 font-[450]">Vendor / email</th>
          <th className="py-2.5 font-[450]">Status</th>
          <th className="py-2.5 pr-8 text-right font-[450]">On hold</th>
          <th className="py-2.5 font-[450]">Case</th>
          <th className="py-2.5 pr-4 text-right font-[450]">Actions</th>
        </tr>
      </thead>
      {GROUPS.filter((g) => groups[g].length).map((g) => (
        <tbody key={g}>
          <tr className="border-b border-rule bg-surface-raised/60"><td colSpan={5} className="px-4 py-2.5 text-[15px] font-[550]">{NAME[g]} <span className="font-[450] text-fg-muted">{groups[g].length}</span></td></tr>
          {groups[g].map((c) => {
            const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
            const name = c.vendorName ?? c.email?.from.address ?? 'Unknown sender';
            return (
              <tr key={c.id} data-case={c.id} onClick={() => onOpen(c.id)} aria-current={c.id === selectedId || undefined}
                className="cursor-pointer border-b border-rule hover:bg-surface-raised/50 aria-[current]:bg-surface-raised/70">
                <td className="py-3 pl-4">
                  <span className="flex items-center gap-3">
                    <Avatar name={name} />
                    <span className="min-w-0">
                      <span className="block truncate leading-5">{name}</span>
                      <span className="block max-w-[34ch] truncate text-[13px] leading-5 text-fg-muted">{c.email?.subject ?? 'Reading email'}</span>
                    </span>
                  </span>
                </td>
                <td className="py-3"><Chip state={c.state} /></td>
                <td className={`py-3 pr-8 text-right font-mono ${cents && !c.release ? 'text-blaze-ink' : 'text-fg-muted'}`}>{cents && !c.release ? fmtCents(cents) : '—'}</td>
                <td className="py-3 font-mono text-fg-muted">{c.id}</td>
                <td className="py-3 pr-4 text-right">{g === 'NEEDS ACTION' && <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }} className="btn btn-outline btn-sm min-w-[84px]">Review</button>}</td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
