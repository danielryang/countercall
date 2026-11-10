// The headline: one plain sentence that says what happened and what it means, so a first-time viewer understands the case in two seconds.
import { Stamp } from '@/components/call/Stamp';
import { headline, type Tone } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { elapsedAt, mmss } from '@/lib/selectors';

const TONE: Record<Tone, { box: string; icon: string; glyph: string }> = {
  danger: { box: 'border-blocked/50 bg-blocked/15', icon: 'bg-blocked text-paper-raised', glyph: '\u2715' },
  warn: { box: 'border-held/50 bg-held/15', icon: 'bg-held text-ink', glyph: '!' },
  ok: { box: 'border-verified/50 bg-verified/15', icon: 'bg-verified text-ink', glyph: '\u2713' },
  progress: { box: 'border-rule bg-surface-raised', icon: 'border border-fg text-fg animate-blink', glyph: '\u2022' },
  neutral: { box: 'border-rule bg-surface-raised', icon: 'bg-fg-muted text-surface', glyph: '\u2022' },
};

export function StatusBanner({ c, nowMs }: { c: CaseView; /** wall clock, live view only: the case clock ticks while the case is still working */ nowMs?: number }) {
  const h = headline(c);
  const t = TONE[h.tone];
  const done = !!c.call?.outcome || c.state === 'cleared';
  return (
    <div className={`flex items-center gap-5 rounded-xl border px-6 py-3.5 ${t.box}`}>
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold ${t.icon}`}>{t.glyph}</span>
      <div className="min-w-0 flex-1">
        <div className="cap">{c.id} {'·'} {c.vendorName ?? 'Unknown sender'} {'·'} {done ? 'result in ' : ''}<span className="font-mono tabular-nums">{mmss(elapsedAt(c, nowMs))}</span>{done ? '' : ' so far'}</div>
        <h1 className="text-[21px] font-semibold leading-7 tracking-tight">{h.title}</h1>
        <p className="mt-0.5 text-[14px] leading-5 text-fg-muted">{h.sub}</p>
      </div>
      {c.call?.outcome && <Stamp c={c} />}
    </div>
  );
}
