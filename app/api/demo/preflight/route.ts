// GET /api/demo/preflight: readiness checks for the presenter. Session + DEMO_ENABLED, else 404. Facts are booleans and counts only.
// The panel's header chips read rampMode/callsEnabled directly (RAMP MOCK must be the truth from env, never a constant in the UI).
import { sessionOf } from '@/lib/auth';
import { env } from '@/lib/env';
import { runPreflight } from '@/lib/preflight-run';
import { q } from '@/lib/store';

export const maxDuration = 15;

export async function GET(req: Request) {
  if (!env().DEMO_ENABLED) return new Response('not found', { status: 404 });
  if (!sessionOf(req)) return new Response('unauthorized', { status: 401 });
  return Response.json(await runPreflight(q), { headers: { 'cache-control': 'no-store' } });
}
