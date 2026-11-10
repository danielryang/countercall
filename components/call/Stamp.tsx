// The outcome stamp. Renders ONLY from a real call.outcome (or a visibly labelled replay of one). Soft, slightly tilted, never decorative.
import { STAMP } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';

export function Stamp({ c }: { c: CaseView }) {
  const o = c.call?.outcome; if (!o) return null;
  const s = STAMP[o.decision.outcome];
  const color = s.status === 'VERIFIED' ? 'verified' : s.status === 'BLOCKED' ? 'blocked' : 'review';
  return (
    <div className="stamp shrink-0 border-2 px-4 py-2 text-center" data-outcome={o.decision.outcome} style={{ borderColor: `var(--color-${color})`, color: `color-mix(in oklab, var(--color-${color}) var(--chip-mix), var(--fg))` }}>
      <div className="font-mono text-[18px] font-semibold uppercase leading-5 tracking-wider">{s.word}</div>
      <div className="text-[11px] font-medium leading-4">{s.sub}</div>
    </div>
  );
}
