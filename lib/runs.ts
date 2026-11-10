// lib/runs.ts: recorded runs. A run is the canonical event stream of one case plus the pacing it should replay at. Used by ?replay=, /dev/states and the screenshot loop.
// Generated runs (scripts/make-runs.ts) come from the REAL pipeline on PGlite; real recordings (scripts/export-run.ts) use measured gaps instead of pace().
export type Envelope = { seq: number; id: string; ts: string; case_id: string | null; type: string; actor: string; payload: Record<string, unknown> };
export type RunEvent = Envelope & { delay_ms: number };
export interface Run { name: string; description: string; recordedAt: string; source: 'generated' | 'recorded'; events: RunEvent[] }

/** Believable gaps for generated runs: what a viewer would wait for at each step (LLM latency, ringing, speech). case.state follows its cause immediately. */
const GAP: Record<string, number> = {
  'email.received': 0, 'email.classified': 2600, 'case.flagged': 2200, 'case.cleared': 2200, 'payment.held': 3000, 'ramp.call': 700, 'call.requested': 3000,
  'call.created': 2200, 'call.status': 2200, 'call.transcript.delta': 3800, 'call.tool': 900, 'call.recording': 1200, 'call.outcome': 3200, 'task.created': 1800,
  'case.state': 0, 'payment.released': 0, 'case.closed': 0,
};
export function pace(events: Envelope[], startIso = '2026-11-10T18:00:00.000Z'): RunEvent[] {
  let t = Date.parse(startIso);
  return events.map((e, i) => {
    let delay = i === 0 ? 0 : (GAP[e.type] ?? 400);
    if (e.type === 'call.status' && (e.payload as { status?: string }).status === 'connected') delay = 6000;   // ringing
    t += delay;
    return { ...e, ts: new Date(t).toISOString(), delay_ms: delay };
  });
}
