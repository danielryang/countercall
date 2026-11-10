// lib/beats.ts: story pacing for the live view. Events can arrive in a burst (flagged, held, call requested within a second); the screen must read as a SEQUENCE a person can follow.
// The queue releases events in order and pauses after each story beat (a case.state change). It only delays what is DRAWN: decisions, timestamps and the audit log are untouched.
export const BEAT_MS = 1800;                 // hold after each state change so the viewer can read what just happened
export const CATCH_UP_BACKLOG = 40;          // a long backlog (a reload, a reconnect) is applied at once instead of replayed slowly

/** How long to wait after showing `e` before showing the next event. */
export const beatDelay = (e: { type: string }, backlog: number): number => (backlog > CATCH_UP_BACKLOG ? 0 : e.type === 'case.state' ? BEAT_MS : 0);

/** The whole schedule for a batch, as data (used by tests and by the hook). */
export const planBeats = <T extends { type: string }>(events: readonly T[]) => events.map((e, i) => ({ event: e, waitAfter: beatDelay(e, events.length - i) }));
