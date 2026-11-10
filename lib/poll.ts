// lib/poll.ts: when to poll /api/events (PLAN s13 M8). Pure, so the schedule is tested without a browser.
//   500 ms while a call is live or something happened in the last minute; 3 s otherwise (and always when the tab is hidden); pause after 10 idle minutes.
export const FAST_MS = 500;
export const SLOW_MS = 3000;
export const ACTIVE_WINDOW_MS = 60_000;
export const IDLE_PAUSE_MS = 10 * 60_000;
export const MAX_BACKOFF_MS = 10_000;

export interface PollInput { calling: boolean; now: number; lastEventAt: number; hidden: boolean; consecutiveErrors: number }
export function nextDelay(i: PollInput): number {
  if (i.consecutiveErrors > 0) return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (i.consecutiveErrors - 1));
  if (i.hidden) return SLOW_MS;
  return i.calling || i.now - i.lastEventAt < ACTIVE_WINDOW_MS ? FAST_MS : SLOW_MS;
}
/** Idle tabs stop polling so a forgotten tab cannot burn the serverless quota. Any pointer or key event resumes. */
export const shouldPause = (now: number, lastInteractionAt: number) => now - lastInteractionAt > IDLE_PAUSE_MS;
