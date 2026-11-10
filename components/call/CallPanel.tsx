'use client';
// The call transcript. Agent text is revealed at speaking pace ONLY for turns that arrive while the viewer is watching; a reload or a paused frame shows everything.
import { useEffect, useRef, useState } from 'react';
import { CPS } from '@/lib/level';
import type { CaseView } from '@/lib/reducer';
import { mmss } from '@/lib/selectors';
import type { TranscriptItem } from '@/lib/voice/events';

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

const ANSWER = { yes: 'Yes, they sent it', no: 'No, they did not send it', unsure: 'Not sure', callback_requested: 'Asked for a call back', wrong_person: 'Wrong person' } as const;

/** Which transcript turn is the vendor's answer to "did you send this?" (the first callee turn after that question). */
export const answerTurn = (turns: TranscriptItem[]) => {
  const ask = turns.findIndex((t) => t.role === 'agent' && /did someone at/i.test(t.text));
  return ask >= 0 ? turns.findIndex((t, i) => i > ask && t.role === 'user') : -1;
};

export function CallTranscript({ c }: { c: CaseView }) {
  const call = c.call;
  const ended = call?.status === 'ended' || call?.status === 'failed';
  const turns = call?.turns ?? [];
  const show = useReveal(turns, !!call && !ended);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [turns.length]);   // scroll the transcript itself, never an ancestor
  if (!call) return null;
  const answers = call.tools.filter((t) => t.name === 'report_answer');
  const last = answers.at(-1)?.args.answer as keyof typeof ANSWER | undefined;
  const digits = call.tools.filter((t) => t.name === 'report_challenge').map((t) => String(t.args.digits ?? '').replace(/[^\d•]/g, '')).find((d) => d.length) ?? '';
  const elapsed = call.connectedAt ? Date.parse(call.endedAt ?? c.updatedAt) - Date.parse(call.connectedAt) : 0;
  const ai = turns.find((t) => t.role === 'agent')?.text.match(/automated/i);
  const ai_i = answerTurn(turns);
  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-2 text-[12px] text-fg-muted">
        <i aria-hidden className={`h-1.5 w-1.5 rounded-full ${call.status === 'failed' ? 'bg-blocked' : ended ? 'bg-fg-muted' : 'bg-live animate-blink'}`} />
        <span>{call.status === 'dialing' ? 'Dialing' : call.status === 'connected' ? `On the call · ${mmss(elapsed)}` : call.status === 'failed' ? 'Call failed' : `Call ended · ${mmss(elapsed)}`}</span>
        {ai && <span className="ml-auto">The caller said it is an automated assistant</span>}
      </div>
      <div ref={box} className="max-h-[176px] overflow-y-auto px-4 py-1.5" aria-live="polite">
        {turns.length === 0 && <div className="cap py-2">{call.status === 'dialing' ? 'Dialing the number on file' : 'Waiting for someone to speak'}<span className="scan-dots" /></div>}
        {turns.map((t, i) => {
          const text = show(t); const live = i === turns.length - 1 && !ended;
          return (
            <div key={t.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 py-1 text-[14px] leading-[22px]">
              <span className="cap pt-px">{t.role === 'agent' ? 'CounterCall' : c.vendorName?.split(' ')[0] ?? 'Vendor'}</span>
              <span className={`${live && text.length < t.text.length ? 'caret' : ''} ${t.role === 'user' ? 'text-fg' : 'text-fg-muted'}`}>{i === ai_i && !!last ? <span className="ev" data-verdict={last === 'no' ? 'no' : last === 'yes' ? 'yes' : undefined}>{text}</span> : text}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-6 border-t border-rule px-4 py-2 text-[12px] text-fg-muted">
        <span>Their answer: <b className="font-medium text-fg">{last ? ANSWER[last] ?? 'Unclear' : 'listening'}</b></span>
        <span>Security question: <b className="font-medium text-fg">{digits ? 'answered' : 'not answered'}</b></span>
      </div>
    </div>
  );
}
