'use client';
// One phase of the case file: a quiet caption row. Collapsed it is a one-line receipt, open it shows its body. Nothing disappears; it just gets out of the way.
import { useState, type ReactNode } from 'react';

export function PhasePanel({ title, summary, collapsed, children }: { index?: string; title: string; summary: ReactNode; collapsed: boolean; children: ReactNode }) {
  const [override, setOverride] = useState<boolean | null>(null);
  const shut = override ?? collapsed;
  return (
    <section className="border-b border-rule last:border-b-0" data-phase={title.toLowerCase()} data-collapsed={shut}>
      <button type="button" onClick={() => setOverride(!shut)} aria-expanded={!shut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-surface-raised">
        <span className={`w-28 shrink-0 ${shut ? 'text-fg-muted' : 'font-medium'}`}>{title}</span>
        <span className={`min-w-0 flex-1 truncate ${shut ? 'text-fg-muted' : 'text-fg-muted'}`}>{summary}</span>
        <span aria-hidden className="text-fg-muted">{shut ? '▸' : '▾'}</span>
      </button>
      {!shut && <div className="pb-1">{children}</div>}
    </section>
  );
}
