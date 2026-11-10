// lib/waterfall.ts: where the time went, email -> flagged -> held -> call placed -> outcome (Assurance item 5). Pure: derived ONLY from the case's own events
// (envelope timestamps, plus the measured `llmMs` of email.classified and the `ms` of each ramp.call). Nothing here is estimated or invented.
import type { CaseView } from './reducer';

export type LapKey = 'detect' | 'hold' | 'dial' | 'call';
export interface Lap {
  key: LapKey;
  /** ms from the email arriving; null when the step never started */
  startMs: number | null;
  /** ms from the email arriving; null while the step is still running or never happened */
  endMs: number | null;
}
export interface Waterfall {
  laps: Lap[];
  /** email -> outcome once there is one; before that, email -> latest event. Equals elapsedMs() either way. */
  totalMs: number;
  done: boolean;
  /** measured model latency for the email read, when the event carries a real number */
  llmMs: number | null;
  /** hold requests sent to Ramp (mock or sandbox) and their summed round-trip time */
  ramp: { count: number; ms: number; mode: string | null } | null;
  /** dial -> answered */
  ringMs: number | null;
}

const at = (iso: string | undefined, t0: number) => (iso ? Date.parse(iso) - t0 : null);

export function waterfall(c: CaseView): Waterfall | null {
  const first = c.timeline.find((t) => t.type === 'email.received') ?? c.timeline[0];
  if (!first) return null;
  const t0 = Date.parse(first.ts);
  const tsOf = (type: string, last = false) => (last ? [...c.timeline].reverse() : c.timeline).find((t) => t.type === type)?.ts;

  const flagged = at(tsOf('case.flagged') ?? tsOf('case.cleared'), t0);
  const held = at(tsOf('payment.held'), t0);
  const placed = at(tsOf('call.created', true) ?? c.call?.startedAt, t0);   // the CURRENT attempt: a retry starts a new call
  const outcome = at(c.call?.outcome?.at, t0);
  const cleared = c.state === 'cleared';
  // No call was placed and none is coming: the case went to a person (e.g. calls switched off, limits hit) or was closed/released by hand.
  // Then the dial and call steps never happened, and the timing ends at that hand-off, which is the case's last event.
  const STILL_GOING = ['scanning', 'flagged', 'held', 'calling'];
  const handedOff = placed === null && !cleared && !STILL_GOING.includes(c.state);
  const handoff = handedOff ? at(c.updatedAt, t0) : null;

  const laps: Lap[] = [{ key: 'detect', startMs: 0, endMs: flagged }];
  if (!cleared) {
    laps.push({ key: 'hold', startMs: flagged, endMs: held });
    laps.push(handedOff ? { key: 'dial', startMs: null, endMs: null } : { key: 'dial', startMs: held, endMs: placed });
    laps.push({ key: 'call', startMs: placed, endMs: outcome });
  }
  const reached = [flagged, held, placed, outcome, handoff].filter((x): x is number => x !== null);
  const holds = c.rampCalls.filter((r) => r.path.endsWith('/hold'));
  return {
    laps,
    // done: the last milestone (the outcome). Still going: the latest event, the same number the case header shows as "so far".
    totalMs: outcome !== null || cleared || handedOff ? Math.max(0, ...reached) : Math.max(0, ...reached, Date.parse(c.updatedAt) - t0),
    done: outcome !== null || cleared || handedOff,
    llmMs: c.llmMs && c.llmMs > 0 ? c.llmMs : null,
    ramp: holds.length ? { count: holds.length, ms: holds.reduce((n, r) => n + r.ms, 0), mode: c.rampMode ?? null } : null,
    ringMs: c.call?.connectedAt ? Date.parse(c.call.connectedAt) - Date.parse(c.call.startedAt) : null,
  };
}

/** Short, mono-friendly duration: "850 ms", "4.8 s", "1:12". */
export function fmtDur(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
