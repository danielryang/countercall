// The outcome badge. Renders ONLY from a real call.outcome (or a visibly labelled replay of one). A soft tinted block with a glyph, set straight.
import { STAMP } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';

const KIND = {
  VERIFIED: { glyph: '✓', cls: 'bg-verified-soft text-verified' },
  BLOCKED: { glyph: '✕', cls: 'bg-blocked-soft text-blocked' },
  NEEDS_REVIEW: { glyph: '!', cls: 'bg-review-soft text-review' },
} as const;

export function Stamp({ c }: { c: CaseView }) {
  const o = c.call?.outcome; if (!o) return null;
  const s = STAMP[o.decision.outcome];
  const k = KIND[s.status === 'VERIFIED' ? 'VERIFIED' : s.status === 'BLOCKED' ? 'BLOCKED' : 'NEEDS_REVIEW'];
  return (
    // state change: the call produced an outcome
    <div className={`stamp flex shrink-0 items-center gap-3 rounded-lg px-4 py-2.5 ${k.cls}`} data-outcome={o.decision.outcome}>
      <span aria-hidden className="text-[20px] font-semibold leading-none">{k.glyph}</span>
      <span>
        <span className="block text-[17px] font-[600] leading-5">{s.word}</span>
        <span className="block text-[13px] leading-4">{s.sub}</span>
      </span>
    </div>
  );
}
