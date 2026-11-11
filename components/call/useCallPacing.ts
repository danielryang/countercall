'use client';
// Paces a phone call for someone watching it happen (a live call, or a replay that is playing); the rules are in lib/reveal.ts. The transcript types out
// one line at a time in the order it was spoken (state change: a line was spoken on the call), and when the result arrives the case stays on the call
// until its last line has been readable for a moment; then the result replaces it all at once (banner, steps, actions), so the screen never
// contradicts itself. The display trails the case by a few seconds at most and only ever shows an earlier state of it: money stays as held as it was.
// A reload or a paused replay frame shows everything at once. Under reduced motion the lines appear whole (no typing), still in order.
import { useEffect, useRef, useState } from 'react';
import { holdingResult, MAX_HOLD_MS, newClock, READ_HOLD_MS, REVEAL_CPS, revealAt, type RevealClock } from '@/lib/reveal';
import type { CaseView } from '@/lib/reducer';
import type { TranscriptItem } from '@/lib/voice/events';

type Pace = { key: string; clock: RevealClock; live: CaseView | null; outcomeAt: number | null; shown: boolean };

export function useCallPacing(c: CaseView): { view: CaseView; show: (t: TranscriptItem) => string } {
  const [, rerender] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setStill(m.matches); on();
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  const call = c.call;
  const key = `${c.id}:${call?.id ?? ''}`;
  const ref = useRef<Pace | null>(null);
  if (ref.current?.key !== key) ref.current = { key, clock: newClock(call?.turns), live: null, outcomeAt: null, shown: !!call?.outcome };
  const p = ref.current;
  const now = performance.now();
  const turns = call?.turns ?? [];
  const r = revealAt(p.clock, turns, now, still ? Infinity : REVEAL_CPS);
  if (call && !call.outcome) p.live = c;                          // the last screen before the result: it stays up while the viewer reads
  if (call?.outcome && p.outcomeAt === null) p.outcomeAt = now;
  const hold = !p.shown && holdingResult({ watched: !!p.live, outcomeAt: p.outcomeAt, settledAt: r.settledAt, lines: turns.length, now });
  if (p.outcomeAt !== null && !hold) p.shown = true;               // once the result is on screen it stays there
  const until = hold && r.settledAt !== null ? Math.min(Math.max(p.outcomeAt!, r.settledAt) + READ_HOLD_MS, p.outcomeAt! + MAX_HOLD_MS) : null;
  useEffect(() => {
    if (!r.settled) { const i = window.setInterval(() => rerender((n) => n + 1), 40); return () => window.clearInterval(i); }                 // typing
    if (until !== null) { const t = window.setTimeout(() => rerender((n) => n + 1), Math.max(0, until - performance.now()) + 20); return () => window.clearTimeout(t); }   // reading
  }, [r.settled, until]);
  const view = hold && p.live && call ? { ...p.live, updatedAt: c.updatedAt, call: { ...call, outcome: undefined } } : c;
  return { view, show: (t) => t.text.slice(0, r.chars.get(t.id) ?? t.text.length) };
}
