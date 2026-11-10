'use client';
// RULE rows are deterministic code. The MODEL row is the LLM's advisory read: it can add risk but never clear it or release money (and says so).
// Only the most serious checks show; the rest are one click away.
import { useState } from 'react';
import { SIGNAL_LABEL, CATEGORY_LABEL } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { SEVERITY_RANK } from '@/lib/selectors';

const TOP = 3;
const GLYPH: Record<string, { g: string; cls: string; label: string }> = {
  critical: { g: '✕', cls: 'text-blocked', label: 'fail' }, high: { g: '✕', cls: 'text-blocked', label: 'fail' },
  medium: { g: '!', cls: 'text-held', label: 'warning' }, low: { g: '·', cls: 'text-fg-muted', label: 'note' }, info: { g: '·', cls: 'text-fg-muted', label: 'ok' },
};

export function ChecksPanel({ c }: { c: CaseView }) {
  const [all, setAll] = useState(false);
  const rows = [...c.signals].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const shown = all ? rows : rows.slice(0, TOP);
  const x = c.extraction;
  return (
    <div className="px-4 pb-1">
      {shown.map((s) => {
        const g = GLYPH[s.severity] ?? GLYPH.info;
        return (
          <div key={s.id} className="grid grid-cols-[16px_76px_minmax(0,1fr)] items-baseline gap-2 py-1 text-[13px] leading-5" data-signal={s.id}>
            <span className={`text-center font-semibold ${g.cls}`} role="img" aria-label={g.label}>{g.g}</span>
            <span className="font-medium">{SIGNAL_LABEL[s.id] ?? s.id}</span>
            <span className="truncate text-fg-muted" title={s.detail}>{s.detail}</span>
          </div>
        );
      })}
      {rows.length === 0 && <div className="cap py-1">No rule fired</div>}
      {rows.length > TOP && <button type="button" onClick={() => setAll(!all)} className="cap py-1 pl-6 hover:text-fg">{all ? 'Show fewer' : `Show ${rows.length - TOP} more`}</button>}
      <div className="grid grid-cols-[16px_76px_minmax(0,1fr)] items-baseline gap-2 py-1 text-[13px] leading-5">
        <span className="text-center text-fg-muted" aria-hidden>{'◇'}</span>
        <span className="font-medium">Model</span>
        <span className="truncate text-fg-muted">{x ? `${CATEGORY_LABEL[x.category] ?? x.category} · advisory only` : 'unavailable; rules decide (fail closed)'}</span>
      </div>
    </div>
  );
}
