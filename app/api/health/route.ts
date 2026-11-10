// GET /api/health: a REAL query (an HTTP 200 that never touches the DB would not keep the Supabase project active). Daily cron hits it too.
import { createTask } from '@/lib/detect/deps';
import { emit as emitVoice } from '@/lib/voice/events';
import { makeVoiceCtx } from '@/lib/voice/ctx';
import { reapStaleCalls } from '@/lib/voice/reap';
import { q, sql } from '@/lib/store';

export const maxDuration = 15;
export async function GET() {
  try {
    const [r] = await sql`select now() as now, coalesce(max(seq), 0) as last_seq from events`;
    // Liveness backstop (idempotent, touches only old undecided calls). The daily cron runs this; it must never fail the health check.
    const reaped = await reapStaleCalls({ q, ctx: makeVoiceCtx(q, emitVoice), createTask }).catch((err) => { console.error('reap failed', err); return 0; });
    return Response.json({ ok: true, now: r.now, lastSeq: Number(r.last_seq), reaped }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('health check failed', err);
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
