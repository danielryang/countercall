'use client';
// The call transcript. The case page paces it for someone watching (components/call/useCallPacing.ts): lines type out one at a time, in the order they
// were spoken. `show` says how much of each line is on screen; a line that has not started yet is not drawn. Without `show`, every line is shown whole.
import { useStickToBottom } from 'use-stick-to-bottom';
import type { CaseView } from '@/lib/reducer';
import { mmss } from '@/lib/selectors';
import type { TranscriptItem } from '@/lib/voice/events';

const whole = (t: TranscriptItem) => t.text;

const ANSWER = { yes: 'Yes, they sent it', no: 'No, they did not send it', unsure: 'Not sure', callback_requested: 'Asked for a call back', wrong_person: 'Wrong person' } as const;

/** Which transcript turn is the vendor's answer to "did you send this?" (the first callee turn after that question). */
export const answerTurn = (turns: TranscriptItem[]) => {
  const ask = turns.findIndex((t) => t.role === 'agent' && /did someone at/i.test(t.text));
  return ask >= 0 ? turns.findIndex((t, i) => i > ask && t.role === 'user') : -1;
};

export function CallTranscript({ c, show = whole }: { c: CaseView; show?: (t: TranscriptItem) => string }) {
  const call = c.call;
  const ended = call?.status === 'ended' || call?.status === 'failed';
  const turns = call?.turns ?? [];
  // The transcript scrolls inside its own box and stays pinned to the newest words while they are revealed (new turns AND growing text), unless the viewer
  // scrolls up to reread. Instant, not the library's spring: the motion rules allow no springs, and an instant jump is also the reduced-motion behaviour.
  const { scrollRef, contentRef } = useStickToBottom({ initial: 'instant', resize: 'instant' });
  if (!call) return null;
  const shown = turns.map((t) => show(t));
  const caughtUp = turns.every((t, i) => shown[i].length === t.text.length);
  const ai_i = answerTurn(turns);
  // Nothing runs ahead of the transcript: the vendor's answer is reported once the line that carries it is on screen, the security question once every
  // line received so far is.
  const answerIn = ai_i >= 0 ? shown[ai_i].length === turns[ai_i].text.length : caughtUp;
  const answers = call.tools.filter((t) => t.name === 'report_answer');
  const last = answerIn ? answers.at(-1)?.args.answer as keyof typeof ANSWER | undefined : undefined;
  const digits = !caughtUp ? '' : call.tools.filter((t) => t.name === 'report_challenge').map((t) => String(t.args.digits ?? '').replace(/[^\d•]/g, '')).find((d) => d.length) ?? '';
  const elapsed = call.connectedAt ? Date.parse(call.endedAt ?? c.updatedAt) - Date.parse(call.connectedAt) : 0;
  const firstAgent = turns.findIndex((t) => t.role === 'agent');
  const ai = firstAgent >= 0 && /automated/i.test(shown[firstAgent]);
  const started = shown.some((s) => s.length > 0);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-rule bg-surface">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-rule px-4 py-2 text-[13px] text-fg-muted">
        <i aria-hidden className={`h-2 w-2 rounded-full ${call.status === 'failed' ? 'bg-blocked' : ended ? 'bg-fg-muted' : 'bg-fg animate-blink'}`} />
        <span>{call.status === 'dialing' ? 'Dialing' : call.status === 'connected' ? `On the call · ${mmss(elapsed)}` : call.status === 'failed' ? 'Call failed' : `Call ended · ${mmss(elapsed)}`}</span>
        {ai && <span className="ml-auto">The caller said it is an automated assistant</span>}
      </div>
      {/* The transcript fills the open step and scrolls inside it. */}
      <div ref={scrollRef} className="fade-top min-h-[66px] flex-1 overflow-y-auto" aria-live="polite">
      <div ref={contentRef} className="px-4 pb-1.5 pt-9">
        {!started && <div className="cap py-2">{call.status === 'dialing' ? 'Dialing the number on file' : 'Waiting for someone to speak'}<span className="scan-dots" /></div>}
        {turns.map((t, i) => {
          const text = shown[i];
          if (!text && t.text) return null;                       // waiting for the line above it to finish
          const typing = text.length < t.text.length;
          return (
            <div key={t.id} className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 py-1.5 text-[15.5px] leading-6">
              <span className={`pt-0.5 text-[13px] font-semibold ${t.role === 'agent' ? 'text-fg-muted' : ''}`}>{t.role === 'agent' ? 'CounterCall' : c.vendorName?.split(' ')[0] ?? 'Vendor'}</span>
              <span className={`${typing ? 'caret' : ''} ${t.role === 'user' ? 'text-fg' : 'text-fg-muted'}`}>{i === ai_i && !!last ? <span className="ev" data-verdict={last === 'no' ? 'no' : last === 'yes' ? 'yes' : undefined}>{text}</span> : text}</span>
            </div>
          );
        })}
      </div>
      </div>
      <div className="flex shrink-0 gap-8 border-t border-rule px-4 py-2.5 text-[13px] text-fg-muted">
        <span>Their answer: <b className="font-semibold text-fg">{last ? ANSWER[last] ?? 'Unclear' : 'listening'}</b></span>
        <span>Security question: <b className="font-semibold text-fg">{digits ? 'answered' : 'not answered'}</b></span>
      </div>
    </div>
  );
}
