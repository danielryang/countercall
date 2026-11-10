// POST /api/cases/[id]/release {destination, note?}: the ONLY way money moves. Session required; the approver is the session name, never the request body.
import { requireSession } from '@/lib/auth';
import { rampFor } from '@/lib/ramp-for';
import { env } from '@/lib/env';
import type { ReleaseDestination } from '@/lib/events';
import { releaseCase } from '@/lib/release';
import { emit, tx } from '@/lib/store';

export const maxDuration = 30;
const DESTINATIONS: ReleaseDestination[] = ['on_file', 'new_account_pending_ramp_approval'];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = requireSession(req);
  if (gate instanceof Response) return gate;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { destination?: unknown; note?: unknown } | null;
  if (!body || !DESTINATIONS.includes(body.destination as ReleaseDestination)) return Response.json({ ok: false, reason: 'destination must be on_file or new_account_pending_ramp_approval' }, { status: 400 });
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined;
  const r = await releaseCase({
    tx, ramp: rampFor, mode: env().RAMP_MODE, emit: (e) => emit(e),
  }, id, gate.n, body.destination as ReleaseDestination, note);
  return r.ok ? Response.json({ ok: true, paymentIds: r.paymentIds }) : Response.json({ ok: false, reason: r.reason }, { status: r.status });
}
