'use client';
// The live call: the only inverted (dark) surface, so the call is the visual climax. Everything here is derived from events; the stamp renders ONLY from a real
// call.outcome. Agent text is revealed at speaking pace (replace-by-snapshot transcripts would otherwise outrun the audio).
import { useEffect, useRef, useState } from 'react';
import { STAMP } from '@/lib/copy';
import { CPS } from '@/lib/level';
import type { CaseView } from '@/lib/reducer';
import { mmss } from '@/lib/selectors';
import type { TranscriptItem } from '@/lib/voice/events';

/** Agent text is revealed at speaking pace ONLY for turns that arrive while the viewer is watching. Turns already present on first render (a reload mid-call,
 *  a paused or frozen replay frame) show in full: pacing is for the live moment, not for history. */
function useReveal(turns: TranscriptItem[], pace: boolean): (t: TranscriptItem) => string {
  const first = useRef(new Map<string, number>());
  const initial = useRef<Set<string> | null>(null);
  if (initial.current === null) initial.current = new Set(turns.map((t) => t.id));
  const [, tick] = useState(0);
  const now = typeof performance === 'undefined' ? 0 : performance.now();
  for (const t of turns) if (!first.current.has(t.id)) first.current.set(t.id, now);
  const shown = (t: TranscriptItem) => (t.role !== 'agent' || !pace || initial.current!.has(t.id) ? t.text.length : Math.floor(((now - (first.current.get(t.id) ?? now)) / 1000) * CPS));
  const pending = turns.some((t) => shown(t) < t.text.length);
  useEffect(() => { if (!pending) return; const i = setInterval(() => tick((n) => n + 1), 80); return () => clearInterval(i); }, [pending]);
  return (t) => t.text.slice(0, Math.min(t.text.length, shown(t)));
}

const ANSWER_LABEL = { yes: 'Yes', no: 'No', unsure: 'Unclear', callback_requested: 'Unclear', wrong_person: 'Unclear' } as const;

export function CallPanel({ c }: { c: CaseView }) {
  const call = c.call;
  const ended = call?.status === 'ended' || call?.status === 'failed';
  const turns = call?.turns ?? [];
  const show = useReveal(turns, !!call && !ended);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns.length, call?.outcome]);
  if (!call) return null;

  const answers = call.tools.filter((t) => t.name === 'report_answer');
  const lastAnswer = answers.at(-1)?.args.answer as keyof typeof ANSWER_LABEL | undefined;
  const digits = call.tools.filter((t) => t.name === 'report_challenge').map((t) => String(t.args.digits ?? '').replace(/[^\d\u2022]/g, '')).find((d) => d.length) ?? '';   // masked: only how many were given matters
  const elapsed = call.connectedAt ? Date.parse(call.endedAt ?? c.updatedAt) - Date.parse(call.connectedAt) : 0;
  const disclosed = turns.find((t) => t.role === 'agent')?.text.match(/automated/i);
  const askIdx = turns.findIndex((t) => t.role === 'agent' && /did someone at/i.test(t.text));
  const answerIdx = askIdx >= 0 ? turns.findIndex((t, i) => i > askIdx && t.role === 'user') : -1;
  const o = call.outcome;
  const stamp = o ? STAMP[o.decision.outcome] : null;
  const task = c.tasks.find((t) => t.status === 'open');
  const color = stamp ? (stamp.status === 'VERIFIED' ? 'verified' : stamp.status === 'BLOCKED' ? 'danger' : 'review') : 'signal';

  return (
    <section className={`flex h-full min-h-0 flex-col border-l-2 bg-surface-raised ${ended ? 'border-rule' : 'border-signal'}`} style={stamp ? { borderLeftColor: `var(--color-${color})` } : undefined} aria-label="Callback">
      <header className="flex items-baseline gap-3 px-5 pb-2 pt-4">
        <h2 className="text-[14px] font-medium">Callback</h2>
        <span className="cap truncate">{c.vendorName} {'\u00b7'} <span className="font-mono tabular-nums">{call.contact?.phoneMasked ?? c.trusted?.phoneMasked}</span></span>
        <span className="cap ml-auto flex shrink-0 items-center gap-2">
          <i aria-hidden className={`h-1.5 w-1.5 ${call.status === 'failed' ? 'bg-blocked' : ended ? 'bg-fg-muted' : 'bg-signal-soft animate-blink'}`} />
          {call.status === 'dialing' ? 'Dialing' : call.status === 'connected' ? `Connected ${mmss(elapsed)}` : call.status === 'failed' ? 'Failed' : `Ended ${mmss(elapsed)}`}
          {disclosed && <span>{'\u00b7'} AI disclosed</span>}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule px-5 py-2" aria-live="polite">
        {turns.length === 0 && <div className="cap">{call.status === 'dialing' ? 'Dialing the number on file' : 'Waiting for speech'}<span className="scan-dots" /></div>}
        {turns.map((t, i) => {
          const text = show(t);
          const live = i === turns.length - 1 && !ended;
          return (
            <div key={t.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2 py-1 text-[14px] leading-[22px]">
              <span className="cap pt-px">{t.role === 'agent' ? 'Agent' : 'Callee'}</span>
              <span className={`${live && text.length < t.text.length ? 'caret' : ''} ${t.role === 'user' ? 'text-fg' : 'text-fg-muted'}`}>
                {i === answerIdx && !!lastAnswer ? <span className="ev" style={{ ['--sweep-delay' as string]: '100ms' }}>{text}</span> : text}
              </span>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <footer className="flex items-end justify-between gap-4 px-5 pb-4 pt-2">
        <dl className="cap space-y-0.5">
          <div className="flex gap-3"><dt className="w-14">Answer</dt><dd className="text-fg">{lastAnswer ? ANSWER_LABEL[lastAnswer] ?? 'Unclear' : 'Listening'}</dd></div>
          <div className="flex gap-3"><dt className="w-14">Detail</dt><dd className="text-fg">{digits ? `${Math.min(4, digits.length)} of 4 heard` : 'Not given'}</dd></div>
        </dl>
        {stamp && o && (
          <div className="stamp border-2 px-3 py-1.5 text-right" data-outcome={o.decision.outcome} style={{ borderColor: `var(--color-${color})`, color: `var(--color-${color})` }}>
            <div className="font-mono text-[18px] font-semibold uppercase leading-5 tracking-wider">{stamp.word}</div>
            <div className="cap" style={{ color: 'inherit' }}>{stamp.sub}{task ? ` \u00b7 task #${task.id}` : ''}</div>
          </div>
        )}
      </footer>
    </section>
  );
}
