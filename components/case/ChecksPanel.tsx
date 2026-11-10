// RULE rows are deterministic code. MODEL rows are the LLM's advisory read: they can add risk but can never clear it or release money (and the label says so).
import { SIGNAL_LABEL, CATEGORY_LABEL } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { SEVERITY_RANK } from '@/lib/selectors';

const SEV: Record<string, { text: string; cls: string }> = {
  critical: { text: 'FAIL', cls: 'bg-blocked text-paper-raised' }, high: { text: 'FAIL', cls: 'bg-blocked text-paper-raised' },
  medium: { text: 'WARN', cls: 'bg-held text-ink' }, low: { text: 'NOTE', cls: 'border border-rule text-fg-muted' }, info: { text: 'OK', cls: 'border border-rule text-fg-muted' },
};

export function ChecksPanel({ c }: { c: CaseView }) {
  const rows = [...c.signals].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const x = c.extraction;
  return (
    <div className="divide-y divide-dashed divide-rule">
      {rows.map((s) => {
        const sev = SEV[s.severity] ?? SEV.info;
        return (
          <div key={s.id} className="grid grid-cols-[44px_84px_44px_minmax(0,1fr)] items-baseline gap-2 px-3 py-1 text-[13px] leading-5" data-signal={s.id}>
            <span className="label text-fg-muted">Rule</span>
            <span className="label truncate">{SIGNAL_LABEL[s.id] ?? s.id}</span>
            <span className={`label inline-block px-1 text-center ${sev.cls}`}>{sev.text}</span>
            <span className="text-fg-muted">{s.detail}</span>
          </div>
        );
      })}
      {rows.length === 0 && <div className="label px-3 py-2 text-fg-muted">No rule fired</div>}
      <div className="grid grid-cols-[44px_1fr] items-baseline gap-2 px-3 py-1 text-[13px] leading-5">
        <span className="label border border-dashed border-rule px-1 text-center text-fg-muted">Model</span>
        <span className="text-fg-muted">{x ? <><span className="text-fg">{CATEGORY_LABEL[x.category] ?? x.category}</span>{x.urgency !== 'none' ? ` · ${x.urgency} urgency` : ''} · advisory{c.llmMs ? ` · ${(c.llmMs / 1000).toFixed(1)}s` : ''}</> : 'model unavailable: rules decide (fail closed)'}</span>
      </div>
    </div>
  );
}
