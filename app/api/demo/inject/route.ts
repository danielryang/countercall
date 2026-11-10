// POST /api/demo/inject {fixtureId, replay?}: runs a fixture through the real ingestEmail. Session + DEMO_ENABLED, else 404. Rate-limited.
import { requireDemo } from '@/lib/auth';
import { fixtureIds, injectFixtureEmail } from '@/lib/demo';
import { allow } from '@/lib/ratelimit';

export const maxDuration = 60;   // one Haiku call + holds + emits

export async function POST(req: Request) {
  const gate = requireDemo(req);
  if (gate instanceof Response) return gate;
  if (!(await allow('inject', 10, 1))) return new Response('slow down', { status: 429 });
  const body = (await req.json().catch(() => null)) as { fixtureId?: unknown; replay?: unknown } | null;
  if (!body || typeof body.fixtureId !== 'string' || !fixtureIds().includes(body.fixtureId)) return Response.json({ error: 'unknown fixtureId', fixtureIds: fixtureIds() }, { status: 400 });
  try {
    const { caseId } = await injectFixtureEmail(body.fixtureId, { replay: body.replay === true });
    return Response.json({ caseId }, { status: 202 });
  } catch (err) {
    console.error('inject failed', body.fixtureId, err);
    return Response.json({ error: 'ingest failed' }, { status: 500 });
  }
}
