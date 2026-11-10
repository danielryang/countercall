'use client';
// One phase of the case file. Open: caption + body. Collapsed: a one-line receipt (nothing disappears, it just gets out of the way so one element is in focus).
import { useState, type ReactNode } from 'react';

export function PhasePanel({ index, title, summary, collapsed, children }: { index: string; title: string; summary: ReactNode; collapsed: boolean; children: ReactNode }) {
  const [override, setOverride] = useState<boolean | null>(null);
  const shut = override ?? collapsed;
  return (
    <section className="border-b border-dashed border-rule last:border-b-0" data-phase={title.toLowerCase()} data-collapsed={shut}>
      <button type="button" onClick={() => setOverride(!shut)} aria-expanded={!shut} className="label flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-surface-raised">
        <span className="text-fg-muted">{shut ? '✓' : index.slice(0, 0)}{shut ? ' ' : ''}{index} / {title}</span>
        <span className={`ml-auto truncate normal-case tracking-normal ${shut ? 'text-fg' : 'text-fg-muted'}`}>{summary}</span>
        <span aria-hidden className="text-fg-muted">{shut ? '▸' : '▾'}</span>
      </button>
      {!shut && <div>{children}</div>}
    </section>
  );
}
