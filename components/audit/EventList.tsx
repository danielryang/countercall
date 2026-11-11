// The log itself, newest first: one plain line per entry with its number, time, case and who wrote it. Presentational: rows come from the
// caller (lib/audit-view.ts auditRows over the event stream). The stored event type stays visible in mono, so the line can be checked against the JSON.
import type { AuditRow } from '@/lib/audit-view';
import { humanName } from '@/lib/audit-view';
import { AUDIT, AUDIT_ACTOR, EVENT_LINE } from '@/lib/copy';

const COLS = 'grid-cols-[56px_200px_84px_128px_minmax(0,1fr)]';
/** "Nov 10, 10:00:02 AM" in the viewer's time zone (the exact timestamp stays in the JSON export and the tooltip). */
const stamp = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function EventList({ rows, onCase }: { rows: AuditRow[]; onCase?: (id: string) => void }) {
  return (
    <div role="table" aria-label={AUDIT.title}>
      <div role="row" className={`sticky top-0 z-10 grid ${COLS} gap-x-4 border-b border-rule bg-surface px-4 py-2.5 text-[13px] text-fg-muted`}>
        <span role="columnheader" className="text-right">{AUDIT.cols.seq}</span>
        <span role="columnheader">{AUDIT.cols.time}</span>
        <span role="columnheader">{AUDIT.cols.case}</span>
        <span role="columnheader">{AUDIT.cols.who}</span>
        <span role="columnheader">{AUDIT.cols.what}</span>
      </div>
      {rows.map((r) => (
        <div key={r.seq} role="row" className={`grid ${COLS} items-baseline gap-x-4 border-b border-rule px-4 py-3 hover:bg-surface-raised/50`}>
          <span role="cell" className="text-right font-mono text-[14px] text-fg-muted">{r.seq}</span>
          <span role="cell" className="truncate font-mono text-[14px] text-fg-muted" title={r.ts}>{stamp(r.ts)}</span>
          <span role="cell">
            {onCase
              ? <button type="button" onClick={() => onCase(r.caseId)} className="font-mono text-[14px] underline decoration-rule-strong underline-offset-4 hover:decoration-fg">{r.caseId}</button>
              : <span className="font-mono text-[14px]">{r.caseId}</span>}
          </span>
          <span role="cell" className="truncate text-[15px] text-fg-muted">{humanName(r.actor) ?? AUDIT_ACTOR[r.actorKind]}</span>
          <span role="cell" className="flex min-w-0 items-baseline gap-3">
            <span className="truncate text-[15px]" title={r.type}>{EVENT_LINE[r.type] ?? r.type}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
