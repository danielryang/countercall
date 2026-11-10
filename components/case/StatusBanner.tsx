// The headline: one plain sentence that says what happened and what it means, so a first-time viewer understands the case in two seconds.
import { Stamp } from '@/components/call/Stamp';
import { headline, type Tone } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { elapsedMs, mmss } from '@/lib/selectors';

const TONE: Record<Tone, { box: string; dot: string }> = {
  danger: { box: 'border-blocked/40 bg-blocked/10', dot: 'bg-blocked' },
  warn: { box: 'border-held/40 bg-held/10', dot: 'bg-held' },
  ok: { box: 'border-verified/40 bg-verified/10', dot: 'bg-verified' },
  progress: { box: 'border-live/40 bg-live/10', dot: 'bg-live animate-blink' },
  neutral: { box: 'border-rule bg-surface-raised', dot: 'bg-fg-muted' },
};

export function StatusBanner({ c }: { c: CaseView }) {
  const h = headline(c);
  const t = TONE[h.tone];
  const done = !!c.call?.outcome || c.state === 'cleared';
  return (
    <div className={`flex items-center gap-5 rounded-xl border px-6 py-3.5 ${t.box}`}>
      <i aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${t.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="cap">{c.id} {'·'} {c.vendorName ?? 'Unknown sender'} {'·'} {done ? `result in ${mmss(elapsedMs(c))}` : `${mmss(elapsedMs(c))} so far`}</div>
        <h1 className="text-[21px] font-semibold leading-7 tracking-tight">{h.title}</h1>
        <p className="mt-0.5 text-[14px] leading-5 text-fg-muted">{h.sub}</p>
      </div>
      {c.call?.outcome && <Stamp c={c} />}
    </div>
  );
}
