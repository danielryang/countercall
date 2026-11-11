// lib/reveal.ts: how a phone call is paced for someone watching it happen (a live call, or a replay that is playing). Pure, so it is tested without a
// browser; components/call/useCallPacing.ts runs it on the clock.
//  - The transcript appears strictly in the order it was spoken: a line starts only once the line above it is fully on screen, so an answer never
//    shows before its question has finished.
//  - Lines type at REVEAL_CPS, about three times speaking pace, and no line takes longer than MAX_LINE_MS: the line was already spoken, so the screen catches up.
//  - When the result arrives, the call stays on screen until its last line has been readable for READ_HOLD_MS; then the result replaces it.
//  - Lines already there when the view opens (a reload, a paused replay frame) are shown whole, and a result already there shows at once.

/** Characters per second the transcript types at. People speak about 15. */
export const REVEAL_CPS = 45;
/** Longest any one line takes to appear, in ms. Retell sends a line only after it was spoken, so a long line typed at REVEAL_CPS still left the
 *  screen seconds behind the audio on a real take (CC-0124). Capping the line keeps the order rule and catches up with the call. */
export const MAX_LINE_MS = 800;
/** How long the whole transcript stays readable before the result replaces it, in ms. */
export const READ_HOLD_MS = 3500;
/** A result is never held back longer than this after it arrives, whatever the transcript is doing, in ms. */
export const MAX_HOLD_MS = 20_000;

type Line = { id: string; text: string };
/** When each line was first seen, started typing and finished typing; lines in `whole` were already there when the view opened. */
export interface RevealClock { seen: Map<string, number>; start: Map<string, number>; done: Map<string, number>; whole: Set<string> }

/** A clock for one call. The lines passed in (those on screen when the view opens) are shown whole. */
export const newClock = (lines: Line[] = []): RevealClock => ({ seen: new Map(), start: new Map(), done: new Map(), whole: new Set(lines.map((l) => l.id)) });

/** How many characters of each line are on screen at `now` (ms on any steady clock). It records first sightings, starts and finishes in the clock, so
 *  call it on every render with the latest lines. A line, once shown in full, stays in full: words added to it later appear at once rather than typing
 *  over the line below. `cps` Infinity shows each line whole (reduced motion), still one after another. `settledAt`: when the last line finished, once
 *  every line is fully shown; null while any line is still typing or waiting. */
export function revealAt(clock: RevealClock, lines: Line[], now: number, cps = REVEAL_CPS): { chars: Map<string, number>; settled: boolean; settledAt: number | null } {
  const chars = new Map<string, number>();
  let prevEnd = -Infinity;     // when the line above is fully shown
  let waiting = false;         // some line is still typing or waiting its turn
  for (const l of lines) {
    if (!clock.seen.has(l.id)) clock.seen.set(l.id, now);
    const len = l.text.length;
    if (clock.whole.has(l.id) || clock.done.has(l.id)) {
      chars.set(l.id, len);
      prevEnd = Math.max(prevEnd, clock.done.get(l.id) ?? clock.seen.get(l.id)!);
      continue;
    }
    let start = clock.start.get(l.id);
    if (start === undefined) {
      if (waiting || now < prevEnd) { waiting = true; chars.set(l.id, 0); continue; }   // the line above is still typing: this one, and all after it, wait
      start = Math.max(prevEnd, clock.seen.get(l.id)!);
      clock.start.set(l.id, start);
    }
    const dur = cps === Infinity ? 0 : Math.min(MAX_LINE_MS, (len / cps) * 1000);
    const end = start + dur;
    if (now >= end) { clock.done.set(l.id, end); chars.set(l.id, len); }
    else { chars.set(l.id, Math.max(0, Math.floor(((now - start) / dur) * len))); waiting = true; }
    prevEnd = Math.max(prevEnd, end);
  }
  return { chars, settled: !waiting, settledAt: !waiting && lines.length ? prevEnd : null };
}

/** Whether the case should still show the call rather than its result: the viewer watched the call (not a reload of a finished case), the result has
 *  arrived, there is a transcript to read, and it is still typing or has been fully readable for less than `holdMs`. Never longer than MAX_HOLD_MS. */
export function holdingResult(p: { watched: boolean; outcomeAt: number | null; settledAt: number | null; lines: number; now: number; holdMs?: number }): boolean {
  if (!p.watched || p.outcomeAt === null || p.lines === 0) return false;
  if (p.now >= p.outcomeAt + MAX_HOLD_MS) return false;
  if (p.settledAt === null) return true;
  return p.now < Math.max(p.outcomeAt, p.settledAt) + (p.holdMs ?? READ_HOLD_MS);
}
