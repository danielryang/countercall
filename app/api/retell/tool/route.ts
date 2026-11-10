// POST /api/retell/tool: ONE endpoint for the three report-only tools. Answer in well under 1 s. Never reveals whether a challenge matched.
import { emit as emitVoice } from '@/lib/voice/events';
import { makeVoiceCtx } from '@/lib/voice/ctx';
import { processToolCall, type ToolPayload } from '@/lib/voice/handle';
import { verifyRetell } from '@/lib/voice/retell';
import { q } from '@/lib/store';

export const maxDuration = 15;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verifyRetell(raw, req))) return new Response('unauthorized', { status: 401 });
  let p: ToolPayload;
  try { p = JSON.parse(raw) as ToolPayload; } catch { return Response.json({ recorded: false }, { status: 400 }); }
  if (!p?.call?.call_id) return Response.json({ recorded: false }, { status: 400 });
  const r = await processToolCall(makeVoiceCtx(q, emitVoice), p);
  return Response.json(r.body, { status: r.status });
}
