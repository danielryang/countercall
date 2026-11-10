// The log itself, newest first: one plain line per entry with its number, time, case and who wrote it. Presentational: rows come from the
// caller (lib/audit-view.ts auditRows over the event stream). The stored event type stays visible in mono, so the line can be checked against the JSON.
import type { AuditRow } from '@/lib/audit-view';
import { humanName } from '@/lib/audit-view';
import { AUDIT, AUDIT_ACTOR, EVENT_LINE } from '@/lib/copy';

const COLS = 'grid-cols-[48px_180px_72px_104px_minmax(0,1fr)]';
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
/** "2026-11-10 14:04:02.118" in the viewer's time zone. */
const stamp = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

export function EventList({ rows, onCase }: { rows: AuditRow[]; onCase?: (id: string) => void }) {
  return (
    <div role="table" aria-label={AUDIT.title} className="px-2 pb-2">
      <div role="row" className={`cap sticky top-0 z-10 grid ${COLS} gap-x-3 border-b border-rule bg-surface-raised px-3 pb-2 pt-1`}>
        <span role="columnheader" className="text-right">{AUDIT.cols.seq}</span>
        <span role="columnheader">{AUDIT.cols.time}</span>
        <span role="columnheader">{AUDIT.cols.case}</span>
        <span role="columnheader">{AUDIT.cols.who}</span>
        <span role="columnheader">{AUDIT.cols.what}</span>
      </div>
      {rows.map((r) => (
        <div key={r.seq} role="row" className={`grid ${COLS} items-baseline gap-x-3 rounded-md px-3 py-1.5 hover:bg-surface/60`}>
          <span role="cell" className="text-right font-mono text-[12px] tabular-nums text-fg-muted">{r.seq}</span>
          <span role="cell" className="truncate font-mono text-[12px] tabular-nums text-fg-muted">{stamp(r.ts)}</span>
          <span role="cell">
            {onCase
              ? <button type="button" onClick={() => onCase(r.caseId)} className="font-mono text-[12px] hover:underline underline-offset-4">{r.caseId}</button>
              : <span className="font-mono text-[12px]">{r.caseId}</span>}
          </span>
          <span role="cell" className="truncate text-[13px] text-fg-muted">{humanName(r.actor) ?? AUDIT_ACTOR[r.actorKind]}</span>
          <span role="cell" className="flex min-w-0 items-baseline gap-3">
            <span className="truncate text-[13px]">{EVENT_LINE[r.type] ?? r.type}</span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-muted">{r.type}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
