// One queue row: 52px, two lines. Line 1 vendor + status chip, line 2 subject + amount at risk. A 3px status bar marks risk; the selected row gets a solid ink frame.
import { Chip } from '@/components/ui/Chip';
import type { CaseState } from '@/lib/events';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

const BAR: Record<CaseState, string> = {
  scanning: 'bg-transparent', cleared: 'bg-transparent', released: 'bg-transparent', closed: 'bg-transparent',
  flagged: 'bg-danger', held: 'bg-held', calling: 'bg-signal', awaiting_approval: 'bg-verified', fraud_blocked: 'bg-blocked', needs_human: 'bg-review',
};

export function QueueRow({ c, selected, onSelect }: { c: CaseView; selected: boolean; onSelect: () => void }) {
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  return (
    <button
      type="button" onClick={onSelect} aria-current={selected} data-case={c.id}
      className={`relative grid h-[52px] w-full grid-cols-[1fr_auto] items-center gap-x-3 border-b border-dashed border-rule px-3 text-left transition-colors duration-[var(--d-fast)] ${selected ? 'bg-surface-raised outline outline-1 -outline-offset-1 outline-fg' : 'hover:bg-surface-raised'}`}
    >
      <i aria-hidden className={`absolute left-0 top-0 h-full w-[3px] ${BAR[c.state]}`} />
      <span className="truncate text-[15px] font-semibold leading-5">{c.vendorName ?? c.email?.from.address ?? 'Unknown sender'}</span>
      <span className="justify-self-end"><Chip state={c.state} /></span>
      <span className="truncate text-[13px] leading-4 text-fg-muted">{c.email?.subject ?? 'Reading email'}</span>
      <span className="justify-self-end font-mono text-[12px] leading-4 tabular-nums text-fg-muted">{cents ? fmtCents(cents) : '—'}</span>
    </button>
  );
}
