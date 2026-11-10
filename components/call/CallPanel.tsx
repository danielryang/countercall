'use client';
// The live call: the only inverted (dark) surface, so the call is the visual climax. Everything here is derived from events; the stamp renders ONLY from a real
// call.outcome. Agent text is revealed at speaking pace (replace-by-snapshot transcripts would otherwise outrun the audio).
import { useEffect, useRef, useState } from 'react';
import { STAMP, REASON_TEXT } from '@/lib/copy';
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

const NODES = ['Dialing', 'Connected', 'Answered', 'Outcome'] as const;
const ANSWER_SLOT = { yes: 0, no: 1, unsure: 2, callback_requested: 2, wrong_person: 2 } as const;

export function CallPanel({ c }: { c: CaseView }) {
  const call = c.call;
  const ended = call?.status === 'ended' || call?.status === 'failed';
  const turns = call?.turns ?? [];
  const show = useReveal(turns, !!call && !ended);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns.length, call?.outcome]);
  if (!call) return null;

  const answers = call.tools.filter((t) => t.name === 'report_answer');
  const lastAnswer = answers.at(-1)?.args.answer as keyof typeof ANSWER_SLOT | undefined;
  const slot = lastAnswer && lastAnswer in ANSWER_SLOT ? ANSWER_SLOT[lastAnswer] : -1;
  const digits = call.tools.filter((t) => t.name === 'report_challenge').map((t) => String(t.args.digits ?? '').replace(/[^\d\u2022]/g, '')).find((d) => d.length) ?? '';   // digits arrive masked (bullets): only how many were given matters
  const reached = [true, !!call.connectedAt || ended || call.status === 'connected', answers.length > 0, !!call.outcome];
  const elapsed = call.connectedAt ? Date.parse(call.endedAt ?? c.updatedAt) - Date.parse(call.connectedAt) : 0;
  const disclosed = turns.find((t) => t.role === 'agent')?.text.match(/automated/i);
  const askIdx = turns.findIndex((t) => t.role === 'agent' && /did someone at/i.test(t.text));
  const answerIdx = askIdx >= 0 ? turns.findIndex((t, i) => i > askIdx && t.role === 'user') : -1;
  const o = call.outcome;
  const stamp = o ? STAMP[o.decision.outcome] : null;
  const task = c.tasks.find((t) => t.status === 'open');

  return (
    <section className="night flex h-full min-h-0 flex-col bg-surface text-fg" aria-label="Verify by callback">
      <header className="label flex items-center gap-3 border-b border-dashed border-rule px-3 py-1.5">
        <span className="text-fg-muted">05 / Verify by callback</span>
        <span className="ml-auto flex items-center gap-2 normal-case tracking-normal">
          <i aria-hidden className={`h-2 w-2 ${call.status === 'failed' ? 'bg-blocked' : ended ? 'bg-fg-muted' : 'bg-signal-soft animate-blink'}`} />
          <span className="label">{call.status === 'dialing' ? 'Dialing' : call.status === 'connected' ? `Connected ${mmss(elapsed)}` : call.status === 'failed' ? 'Failed' : `Ended ${mmss(elapsed)}`}</span>
          {disclosed && <span className="label border border-rule px-1 text-fg-muted">AI disclosed</span>}
        </span>
      </header>

      <div className="label flex items-center gap-2 px-3 py-2" aria-label="Call progress">
        {NODES.map((n, i) => (
          <span key={n} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 border ${reached[i] ? 'border-fg bg-fg' : 'border-rule'}`} aria-hidden />
            <span className={reached[i] ? 'text-fg' : 'text-fg-muted'}>{n}</span>
            {i < NODES.length - 1 && <span className={`h-px w-8 ${reached[i + 1] ? 'bg-fg' : 'border-t border-dashed border-rule'}`} aria-hidden />}
          </span>
        ))}
      </div>
      <div className="px-3 pb-2 text-[13px] text-fg-muted"><span className="label">To</span> <span className="text-fg">{c.vendorName}</span> · <span className="font-mono tabular-nums">{call.contact?.phoneMasked ?? c.trusted?.phoneMasked}</span> <span className="label ml-1 text-fg">{'✓'} On file</span></div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-dashed border-rule px-3 py-2" aria-live="polite">
        {turns.length === 0 && <div className="label text-fg-muted">{call.status === 'dialing' ? 'Dialing the number on file' : 'Waiting for speech'}<span className="scan-dots" /></div>}
        {turns.map((t, i) => {
          const text = show(t);
          const live = i === turns.length - 1 && !ended;
          return (
            <div key={t.id} className="grid grid-cols-[60px_1fr] gap-2 py-0.5 text-[13px] leading-5">
              <span className="label text-fg-muted">{t.role === 'agent' ? 'Agent' : 'Callee'}</span>
              <span className={`${live && text.length < t.text.length ? 'caret' : ''} ${t.role === 'user' ? 'text-fg' : 'text-fg-muted'}`}>
                {i === answerIdx && !!lastAnswer ? <span className="ev text-ink" style={{ ['--sweep-delay' as string]: '100ms' }}>{text}</span> : text}
              </span>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <footer className="flex items-end justify-between gap-4 border-t border-dashed border-rule px-3 pb-3 pt-2">
        <div className="label space-y-1.5 text-fg-muted">
          <div className="flex items-center gap-3"><span className="w-16">Answer</span>
            {(['Yes', 'No', 'Unclear'] as const).map((l, i) => <span key={l} className="flex items-center gap-1 text-fg"><i className={`h-2.5 w-2.5 border ${slot === i ? 'border-fg bg-fg' : 'border-rule'}`} aria-hidden />{l}</span>)}</div>
          <div className="flex items-center gap-3"><span className="w-16">Detail</span>
            <span className="flex gap-1">{[0, 1, 2, 3].map((i) => <i key={i} className={`h-2.5 w-2.5 border ${i < Math.min(4, digits.length) ? 'border-fg bg-fg' : 'border-rule'}`} aria-hidden />)}</span>
            <span className="normal-case tracking-normal">{digits ? 'heard' : 'not given'}</span></div>
          <div className="normal-case tracking-normal">heard by MODEL · decided by POLICY</div>
        </div>
        {stamp && o && (
          <div className="stamp border-2 px-3 py-1.5 text-right" data-outcome={o.decision.outcome} style={{ borderColor: `var(--color-${stamp.status === 'VERIFIED' ? 'verified' : stamp.status === 'BLOCKED' ? 'blocked' : 'review'})`, color: `var(--color-${stamp.status === 'VERIFIED' ? 'verified' : stamp.status === 'BLOCKED' ? 'danger' : 'review'})` }}>
            <div className="font-mono text-[22px] font-semibold uppercase leading-6 tracking-wider">{stamp.word}</div>
            <div className="label">{stamp.sub}{task ? ` · task #${task.id}` : ''}</div>
            <div className="label normal-case tracking-normal text-fg-muted">{REASON_TEXT[o.decision.reason].rule}</div>
          </div>
        )}
      </footer>
    </section>
  );
}
