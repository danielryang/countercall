// lib/runs.ts: recorded runs. A run is the canonical event stream of one case plus the pacing it should replay at. Used by ?replay=, /dev/states and the screenshot loop.
// Generated runs (scripts/make-runs.ts) come from the REAL pipeline on PGlite; real recordings (scripts/export-run.ts) use measured gaps instead of pace().
export type Envelope = { seq: number; id: string; ts: string; case_id: string | null; type: string; actor: string; payload: Record<string, unknown> };
export type RunEvent = Envelope & { delay_ms: number };
export interface Run { name: string; description: string; recordedAt: string; source: 'generated' | 'recorded'; events: RunEvent[] }

/** Believable gaps for generated runs: what a viewer would wait for at each step (LLM latency, ringing, speech). case.state follows its cause immediately. */
const GAP: Record<string, number> = {
  'email.received': 0, 'email.classified': 1100, 'case.flagged': 650, 'case.cleared': 650, 'payment.held': 950, 'ramp.call': 450, 'call.requested': 700,
  'call.created': 900, 'call.status': 1400, 'call.transcript.delta': 1900, 'call.tool': 450, 'call.recording': 600, 'call.outcome': 900, 'task.created': 600,
  'case.state': 0, 'payment.released': 0, 'case.closed': 0,
};
export function pace(events: Envelope[], startIso = '2026-11-10T18:00:00.000Z'): RunEvent[] {
  let t = Date.parse(startIso);
  return events.map((e, i) => {
    let delay = i === 0 ? 0 : (GAP[e.type] ?? 400);
    if (e.type === 'call.status' && (e.payload as { status?: string }).status === 'connected') delay = 3600;   // ringing
    t += delay;
    return { ...e, ts: new Date(t).toISOString(), delay_ms: delay };
  });
}
