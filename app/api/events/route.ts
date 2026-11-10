// GET /api/events?after=<seq>&case=<id>&limit<=1000: the live feed AND the audit log (one append-only table). Public when PUBLIC_READ=1.
// Snapshot rule (08 section 3.6): only events after the last system.reset, plus seeded history, so a fresh tab does not download every past take.
import { readAllowed } from '@/lib/auth';
import { sql } from '@/lib/store';

export const maxDuration = 15;
const MAX_LIMIT = 1000;
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  if (!readAllowed(req)) return new Response('unauthorized', { status: 401, headers: NO_STORE });
  const u = new URL(req.url);
  const after = Math.max(0, Number.parseInt(u.searchParams.get('after') ?? '0', 10) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(u.searchParams.get('limit') ?? String(MAX_LIMIT), 10) || MAX_LIMIT));
  const caseId = u.searchParams.get('case');
  let rows;
  try {
    rows = await sql`
    with r as (select coalesce(max(seq), 0) as seq from events where type = 'system.reset')
    select e.seq, e.id, e.ts, e.case_id, e.type, e.actor, e.payload
    from events e, r
    where e.seq > ${after}
      and (e.seq > r.seq or e.case_id in (select id from cases where source = 'seed'))
      and (${caseId}::text is null or e.case_id = ${caseId})
    order by e.seq limit ${limit}`;
  } catch (err) {
    console.error('events query failed', err);
    return Response.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });   // e.g. the database is not configured or reachable yet
  }
  const events = rows.map((e) => ({ seq: Number(e.seq), id: e.id, ts: e.ts, case_id: e.case_id, type: e.type, actor: e.actor, payload: e.payload }));
  return Response.json({ events, lastSeq: events.length ? events[events.length - 1].seq : after, serverTime: new Date().toISOString() }, { headers: NO_STORE });
}
