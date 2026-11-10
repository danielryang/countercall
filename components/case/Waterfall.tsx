// "How long each step took": email -> flagged -> held -> call placed -> result, drawn as a quiet waterfall. Pure and presentational: every number comes from
// lib/waterfall.ts, which reads only the case's own events. No animation: it is a reference view, opened on demand, not a story beat.
import { LAP_LABEL, TIMING } from '@/lib/copy';
import { fmtDur, type Lap, type Waterfall as W } from '@/lib/waterfall';

function detail(l: Lap, w: W): string | null {
  if (l.key === 'detect' && w.llmMs !== null) return TIMING.model(fmtDur(w.llmMs));
  if (l.key === 'hold' && w.ramp) return TIMING.ramp(w.ramp.count, fmtDur(w.ramp.ms), w.ramp.mode);
  if (l.key === 'call' && w.ringMs !== null) return TIMING.ring(fmtDur(w.ringMs));
  return null;
}

export function Waterfall({ w, paced, finished }: { w: W; paced?: boolean; finished?: boolean }) {
  const span = Math.max(1, w.totalMs);
  const pct = (ms: number) => `${Math.min(100, (ms / span) * 100)}%`;
  return (
    <div className="space-y-2.5">
      <ol className="space-y-2" aria-label={TIMING.title}>
        {w.laps.map((l) => {
          const open = l.startMs !== null && l.endMs === null;
          const never = l.startMs === null || (open && finished);
          const dur = l.startMs !== null && l.endMs !== null ? l.endMs - l.startMs : null;
          const d = detail(l, w);
          return (
            <li key={l.key} className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_4.5rem] items-center gap-x-3 text-[13px] leading-5">
              <span className={never ? 'text-fg-muted' : ''}>{LAP_LABEL[l.key]}</span>
              <span aria-hidden className="relative h-2 rounded-sm bg-fg/10">
                {l.startMs !== null && !never && (
                  <i className={`absolute inset-y-0 rounded-sm ${open ? 'hatch' : 'bg-fg/55'}`}
                    style={{ left: pct(l.startMs), width: open ? `calc(100% - ${pct(l.startMs)})` : `max(2px, ${pct(dur ?? 0)})` }} />
                )}
              </span>
              <span className={`text-right font-mono tabular-nums ${dur === null ? 'text-fg-muted' : ''}`}>{dur !== null ? fmtDur(dur) : never ? '—' : '…'}</span>
              {d && <span className="cap col-start-1 col-end-3 -mt-1">{d}</span>}
            </li>
          );
        })}
      </ol>
      <div className="flex items-baseline justify-between border-t border-rule pt-2 text-[13px]">
        <span className="font-medium">{w.done ? TIMING.total : TIMING.sofar}</span>
        <span className="font-mono tabular-nums">{fmtDur(w.totalMs)}</span>
      </div>
      <p className="cap">{paced ? TIMING.paced : TIMING.measured}</p>
    </div>
  );
}
