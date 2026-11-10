// One queue row: vendor and status on the first line, the email subject and the money at risk on the second. Soft hover, raised when selected.
import { Chip } from '@/components/ui/Chip';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

export function QueueRow({ c, selected, onSelect, dim }: { c: CaseView; selected: boolean; onSelect: () => void; dim?: boolean }) {
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  return (
    <button type="button" onClick={onSelect} aria-current={selected} data-case={c.id}
      className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-[var(--d-fast)] ${selected ? 'border-rule bg-surface-raised' : 'border-transparent hover:bg-surface-raised/60'} ${dim && !selected ? 'opacity-70' : ''}`}>
      <span className="truncate text-[14px] font-medium leading-5">{c.vendorName ?? c.email?.from.address ?? 'Unknown sender'}</span>
      <span className="justify-self-end"><Chip state={c.state} /></span>
      <span className="truncate text-[13px] leading-5 text-fg-muted">{c.email?.subject ?? 'Reading email'}</span>
      <span className="justify-self-end font-mono text-[12px] leading-5 tabular-nums text-fg-muted">{cents ? fmtCents(cents) : ''}</span>
    </button>
  );
}
