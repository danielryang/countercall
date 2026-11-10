'use client';
// The audit screen: the log check on top (GET /api/audit/verify via lib/use-audit.ts), then the log itself from the event stream, newest first,
// with filters and a JSON download of exactly the listed entries. In replay mode the list plays the recorded run and the check is not run
// (a recording is not the live log); the panel says so.
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useStream } from '@/components/EventsProvider';
import { EventList } from '@/components/audit/EventList';
import { LogCheck, type LogCheckInput } from '@/components/audit/LogCheck';
import { Card } from '@/components/ui/Card';
import { ACTOR_KINDS, auditCaseIds, auditRows, EVENT_GROUPS, exportDoc, NO_FILTER, type ActorKind, type AuditFilter, type EventGroup } from '@/lib/audit-view';
import { AUDIT, AUDIT_ACTOR, AUDIT_GROUP } from '@/lib/copy';
import type { Envelope, Run } from '@/lib/runs';
import { useAudit } from '@/lib/use-audit';

const PAGE = 200;
const API_PAGE = 1000;

/** Full envelopes (with the already-redacted payloads) for the download: the recorded run, or the public feed up to the newest listed entry. */
async function loadEnvelopes(replay: string | null, upTo: number): Promise<Envelope[]> {
  if (replay) {
    const run = (await (await fetch(`/runs/${encodeURIComponent(replay)}.json`)).json()) as Run;
    return run.events.map(({ delay_ms: _d, ...e }) => e);
  }
  const out: Envelope[] = []; let after = 0;
  for (;;) {
    const r = await fetch(`/api/events?after=${after}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`events ${r.status}`);
    const page = ((await r.json()) as { events: Envelope[] }).events;
    out.push(...page);
    if (page.length < API_PAGE || page[page.length - 1].seq >= upTo) return out;
    after = page[page.length - 1].seq;
  }
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T | null; options: { v: T; l: string }[]; onChange: (v: T | null) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-fg-muted">
      {label}
      <select value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as T | null)}
        className="h-7 rounded-md border border-rule bg-surface px-2 text-[13px] text-fg">
        <option value="">{AUDIT.filters.all}</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

export function AuditView() {
  const { state, status } = useStream();
  const sp = useSearchParams(); const replayName = sp.get('replay');
  const replay = status === 'replay';
  const audit = useAudit({ lastSeq: state.lastSeq, replay });
  const [filter, setFilter] = useState<AuditFilter>(NO_FILTER);
  const [shown, setShown] = useState(PAGE);
  const [dl, setDl] = useState<'idle' | 'busy' | 'failed'>('idle');

  const rows = useMemo(() => auditRows(state, filter), [state, filter]);
  const caseIds = useMemo(() => auditCaseIds(state), [state]);
  const total = useMemo(() => auditRows(state).length, [state]);
  const set = (p: Partial<AuditFilter>) => { setFilter((f) => ({ ...f, ...p })); setShown(PAGE); };

  const input: LogCheckInput = replay ? { kind: 'replay' }
    : audit.status === 'ok' && audit.report ? { kind: 'report', report: audit.report }
    : audit.status === 'loading' ? { kind: 'loading' } : audit.status === 'unauthorized' ? { kind: 'unauthorized' } : { kind: 'error' };

  const download = async () => {
    if (!rows.length || dl === 'busy') return;
    setDl('busy');
    try {
      const all = await loadEnvelopes(replay ? replayName : null, rows[0].seq);
      const doc = exportDoc(all, rows, { source: replay ? `replay:${replayName}` : 'live', filter, exportedAt: new Date().toISOString() });
      const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `countercall-audit-${doc.exportedAt.slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDl('idle');
    } catch { setDl('failed'); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <Card title={AUDIT.checkTitle} className="shrink-0"><LogCheck input={input} liveHref="/audit" /></Card>
      <Card title={AUDIT.title} aside={rows.length === total ? AUDIT.count(total) : `${AUDIT.count(rows.length)} of ${total.toLocaleString('en-US')}`} className="min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 pb-3">
          <p className="cap mr-auto">{AUDIT.listIntro}</p>
          <Select label={AUDIT.filters.case} value={filter.caseId} options={caseIds.map((id) => ({ v: id, l: id }))} onChange={(v) => set({ caseId: v })} />
          <Select<EventGroup> label={AUDIT.filters.group} value={filter.group} options={EVENT_GROUPS.map((g) => ({ v: g, l: AUDIT_GROUP[g] }))} onChange={(v) => set({ group: v })} />
          <Select<ActorKind> label={AUDIT.filters.actor} value={filter.actor} options={ACTOR_KINDS.map((k) => ({ v: k, l: AUDIT_ACTOR[k] }))} onChange={(v) => set({ actor: v })} />
          <button type="button" onClick={download} disabled={!rows.length || dl === 'busy'} title={AUDIT.exportNote}
            className="h-7 rounded-md border border-rule px-3 text-[13px] hover:bg-surface disabled:text-fg-muted">
            {dl === 'busy' ? AUDIT.exporting : dl === 'failed' ? AUDIT.exportFailed : AUDIT.export}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.length
            ? <EventList rows={rows.slice(0, shown)} onCase={(id) => set({ caseId: filter.caseId === id ? null : id })} />
            : <p className="cap mx-5 rounded-lg border border-dashed border-rule p-4">{total ? AUDIT.empty : AUDIT.emptyLog}</p>}
          {rows.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="cap mx-5 mb-3 underline underline-offset-4 hover:text-fg">{AUDIT.more(Math.min(PAGE, rows.length - shown))}</button>
          )}
        </div>
      </Card>
    </div>
  );
}
