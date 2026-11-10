// Case header: who and what at a glance, the status, and the honest email -> outcome time. The four phases are a single quiet line.
import { Chip } from '@/components/ui/Chip';
import { CATEGORY_LABEL, PHASE_LABEL } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { elapsedMs, mmss, PHASES, phasesReached } from '@/lib/selectors';

export function CaseHeader({ c }: { c: CaseView }) {
  const reached = phasesReached(c);
  const done = !!c.call?.outcome || c.state === 'cleared';
  return (
    <div className="border-b border-rule px-6 pb-3 pt-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="cap font-mono">{c.id}</div>
          <h1 className="truncate text-[22px] font-semibold leading-7 tracking-tight">{c.vendorName ?? 'Unknown sender'} <span className="font-normal text-fg-muted">{'·'} {CATEGORY_LABEL[c.decision?.category ?? c.extraction?.category ?? 'other']}</span></h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Chip state={c.state} />
          <span className="cap tabular-nums" title="From the events' own timestamps">{mmss(elapsedMs(c))} from email to {done ? 'outcome' : 'now'}</span>
        </div>
      </div>
      <ol className="mt-3 flex items-center gap-2 text-[12px]" aria-label="Phases">
        {PHASES.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <span className={reached[p] ? 'text-fg' : 'text-fg-muted/50'}>{PHASE_LABEL[p]}</span>
            {i < PHASES.length - 1 && <span className={`h-px w-6 ${reached[PHASES[i + 1]] ? 'bg-fg/60' : 'bg-rule'}`} aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}
