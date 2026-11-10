// lib/voice/reap.ts: liveness backstop. Retell webhooks can be lost (the simulation proves a dropped call_analyzed leaves a case in `calling` forever).
// A call that is still open long after the maximum call duration is settled by the SAME deterministic policy, not by a guess:
// finalizeCall() with disconnection_reason 'max_duration_reached' -> any clear recorded 'no' still blocks; everything else is UNVERIFIED -> needs_human.
import type { EmittedEvent, TaskKind } from '../events';
import type { Q } from '../sink';
import type { VoiceCtx } from './handle';
import { finalizeCall } from './finalize';

export const STALE_CALL_MS = 10 * 60 * 1000;   // the longest call is 4 min (provision-agent.ts); 10 min leaves ample slack and matches the in-flight window

export interface ReapDeps { q: Q; ctx: VoiceCtx; createTask: (caseId: string, kind: TaskKind, title: string, reason: string) => Promise<void>; _emit?: (e: EmittedEvent) => Promise<unknown> }

/** Returns how many calls were settled. Safe to run any time and any number of times: it only touches calls that are open, undecided and old. */
export async function reapStaleCalls(d: ReapDeps, olderThanMs: number = STALE_CALL_MS): Promise<number> {
  const secs = olderThanMs / 1000;
  // 1) the dial never returned an id (crash between reserve and dial): nothing is on the phone; free the case for a human.
  const lost = await d.q<{ id: string; case_id: string }>(
    `update calls set ended_at = now(), disconnection_reason = 'dial_unknown' where ended_at is null and retell_call_id is null and started_at <= now() - make_interval(secs => $1) returning id, case_id`, [secs]);
  for (const c of lost) await d.createTask(c.case_id, 'verify_manually', 'Verify the bank change by phone', 'a call attempt never reported back; no outcome recorded');
  // 2) a real call that is still undecided long after it started: settle by policy. Do NOT require ended_at to be null: call_ended may have
  //    arrived while call_analyzed was lost (found by the simulator), which leaves ended_at set and the call undecided.
  const stale = await d.q<{ retell_call_id: string; case_id: string }>(
    `select retell_call_id, case_id from calls where outcome is null and retell_call_id is not null and started_at <= now() - make_interval(secs => $1)`, [secs]);
  for (const c of stale) {
    await d.ctx.markEnded(c.retell_call_id, 'max_duration_reached');
    await finalizeCall(d.ctx.store, c.case_id, c.retell_call_id, { disconnection_reason: 'max_duration_reached' }, d.ctx.emit);
  }
  return lost.length + stale.length;
}
