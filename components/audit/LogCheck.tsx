// The log check panel at the top of the audit page: is the record sealed, and does every case's status follow from the record alone?
// Presentational: the caller passes the report (GET /api/audit/verify) or why there is none. All words come from lib/copy.ts AUDIT.
import type { AuditReport } from '@/lib/audit';
import { badgeState } from '@/lib/audit-view';
import { AUDIT, CHIP } from '@/lib/copy';
import { AuditBadge } from '@/components/ui/AuditBadge';

export type LogCheckInput =
  | { kind: 'report'; report: AuditReport }
  | { kind: 'loading' } | { kind: 'error' } | { kind: 'unauthorized' } | { kind: 'replay' };

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour12: false });

export function LogCheck({ input, liveHref }: { input: LogCheckInput; liveHref?: string }) {
  if (input.kind !== 'report') {
    const badge = input.kind === 'replay' ? 'replay' : input.kind === 'loading' ? null : 'unavailable';
    const text = input.kind === 'replay' ? AUDIT.replay : input.kind === 'loading' ? AUDIT.loading : input.kind === 'unauthorized' ? AUDIT.unauthorized : AUDIT.unavailable;
    return (
      <div className="flex items-center gap-4 px-5 py-4">
        {badge ? <AuditBadge kind={badge} /> : null}
        <p className="text-[14px] leading-5">{text}{input.kind === 'loading' ? <span className="scan-dots" aria-hidden /> : null}</p>
        {input.kind === 'replay' && liveHref ? <a href={liveHref} className="ml-auto text-[13px] underline underline-offset-4 hover:text-fg-muted">{AUDIT.replayLink}</a> : null}
      </div>
    );
  }
  const r = input.report; const c = r.chain; const kind = badgeState(r);
  const lines: string[] = [];
  if (!c.installed) lines.push(AUDIT.appendOnly);   // the badge already says the seal is not on
  else {
    lines.push(c.intact ? AUDIT.sealed(c.checked) : AUDIT.broken(c.firstBreak?.seq ?? 0));
    if (c.preChain > 0) lines.push(AUDIT.preChain(c.preChain));
  }
  const seal = c.installed ? c.head?.hash ?? null : null;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-5 gap-y-2 px-5 pb-4 pt-2">
      <div className="pt-px"><AuditBadge kind={kind} /></div>
      <div className="min-w-0">
        {lines.map((l) => <p key={l} className="text-[14px] leading-5">{l}</p>)}
        <p className="text-[14px] leading-5">{AUDIT.rebuilt(r.replay.matched, r.replay.cases)}</p>
        {r.replay.outOfBand.length > 0 && <p className="cap mt-1">{AUDIT.outOfBand(r.replay.outOfBand.length)}</p>}
        {r.replay.mismatches.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[13px] leading-5">
            {r.replay.mismatches.slice(0, 4).map((m) => <li key={m.caseId}><span className="font-mono">{'▲'}</span> {AUDIT.mismatch(m.caseId, CHIP[m.replayed]?.label ?? m.replayed, CHIP[m.db]?.label ?? m.db)}</li>)}
          </ul>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        {seal ? (
          <>
            <span className="cap">{AUDIT.latestSeal}</span>
            <span className="font-mono text-[15px] tabular-nums">{seal.slice(0, 12)}</span>
          </>
        ) : null}
        <span className="cap">{AUDIT.checkedAt(clock(r.checkedAt), r.ms)}</span>
      </div>
      {c.installed && <p className="cap col-span-2 col-start-2 max-w-[96ch]">{AUDIT.proves}</p>}
    </div>
  );
}
