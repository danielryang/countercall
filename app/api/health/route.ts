// GET /api/health: a REAL query (an HTTP 200 that never touches the DB would not keep the Supabase project active). Daily cron hits it too.
import { sql } from '@/lib/store';

export const maxDuration = 15;
export async function GET() {
  try {
    const [r] = await sql`select now() as now, coalesce(max(seq), 0) as last_seq from events`;
    return Response.json({ ok: true, now: r.now, lastSeq: Number(r.last_seq) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('health check failed', err);
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
