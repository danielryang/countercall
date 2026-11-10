// Case header: id / vendor, headline, status chip, email -> outcome timer (real: from event timestamps), and the four-phase rail.
import { Chip } from '@/components/ui/Chip';
import { CATEGORY_LABEL, PHASE_LABEL, STATE_NOTE } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { elapsedMs, mmss, PHASES, phasesReached } from '@/lib/selectors';

export function CaseHeader({ c }: { c: CaseView }) {
  const reached = phasesReached(c);
  const done = !!c.call?.outcome || c.state === 'cleared';
  return (
    <div className="border-b border-dashed border-rule px-3 py-2">
      <div className="flex items-center gap-3">
        <h1 className="min-w-0 truncate text-[15px] font-semibold uppercase tracking-tight"><span className="font-mono font-medium">{c.id}</span> <span className="text-fg-muted">/</span> {c.vendorName ?? 'Unknown sender'} <span className="text-fg-muted">{'—'}</span> {CATEGORY_LABEL[c.decision?.category ?? c.extraction?.category ?? 'other']}</h1>
        <span className="ml-auto flex items-center gap-3">
          {STATE_NOTE[c.state] && <span className="label text-fg-muted">{STATE_NOTE[c.state]}</span>}
          <Chip state={c.state} />
          <span className="label tabular-nums" title="From the events' own timestamps">Email{'→'}outcome T+{mmss(elapsedMs(c))}{done ? '' : ' …'}</span>
        </span>
      </div>
      <ol className="label mt-1.5 flex items-center gap-2" aria-label="Phases">
        {PHASES.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <span className={reached[p] ? 'text-fg' : 'text-fg-muted'}>{'①②③④'[i]} {PHASE_LABEL[p]}</span>
            {i < PHASES.length - 1 && <span className={`h-px w-8 ${reached[PHASES[i + 1]] ? 'bg-fg' : 'border-t border-dashed border-rule'}`} aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}
