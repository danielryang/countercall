// One queue row: two lines, generous padding. A 2px status bar marks risk; the selected row is a raised tone. No outline, no dashed rules.
import { Chip } from '@/components/ui/Chip';
import type { CaseState } from '@/lib/events';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

const BAR: Record<CaseState, string> = {
  scanning: 'bg-transparent', cleared: 'bg-transparent', released: 'bg-transparent', closed: 'bg-transparent',
  flagged: 'bg-danger', held: 'bg-held', calling: 'bg-signal', awaiting_approval: 'bg-verified', fraud_blocked: 'bg-blocked', needs_human: 'bg-review',
};

export function QueueRow({ c, selected, onSelect, dim }: { c: CaseView; selected: boolean; onSelect: () => void; dim?: boolean }) {
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  return (
    <button type="button" onClick={onSelect} aria-current={selected} data-case={c.id}
      className={`relative grid w-full grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5 text-left transition-colors duration-[var(--d-fast)] ${selected ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'} ${dim && !selected ? 'opacity-70' : ''}`}>
      <i aria-hidden className={`absolute left-0 top-0 h-full w-[2px] ${BAR[c.state]}`} />
      <span className="truncate text-[14px] font-medium leading-5">{c.vendorName ?? c.email?.from.address ?? 'Unknown sender'}</span>
      <span className="justify-self-end"><Chip state={c.state} /></span>
      <span className="truncate text-[13px] leading-5 text-fg-muted">{c.email?.subject ?? 'Reading email'}</span>
      <span className="justify-self-end font-mono text-[12px] leading-5 tabular-nums text-fg-muted">{cents ? fmtCents(cents) : ''}</span>
    </button>
  );
}
