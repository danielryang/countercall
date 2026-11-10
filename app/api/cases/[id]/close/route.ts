// POST /api/cases/[id]/close {note}: a person closes a case without releasing anything. Session required.
import { requireSession } from '@/lib/auth';
import { closeCase } from '@/lib/release';
import { emit, q } from '@/lib/store';

export const maxDuration = 15;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = requireSession(req);
  if (gate instanceof Response) return gate;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { note?: unknown } | null;
  const r = await closeCase({ q, emit: (e, human) => emit(e, human) }, id, gate.n, typeof body?.note === 'string' ? body.note.slice(0, 500) : '');
  return r.ok ? Response.json({ ok: true }) : Response.json({ ok: false, reason: r.reason }, { status: r.status });
}
