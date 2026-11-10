// POST /api/retell/webhook: Node runtime. Verify the signature on the RAW body, record it, then run the idempotent handler. Retell times out at 10 s and retries 3x.
import { emit as emitVoice } from '@/lib/voice/events';
import { processRetellWebhook, type RetellWebhook } from '@/lib/voice/handle';
import { makeVoiceCtx } from '@/lib/voice/ctx';
import { verifyRetell } from '@/lib/voice/retell';
import { q } from '@/lib/store';
import { createHash } from 'node:crypto';

export const maxDuration = 60;

export async function POST(req: Request) {
  const raw = await req.text();                                   // never JSON.stringify(parsed): the signature is over the raw bytes
  if (!(await verifyRetell(raw, req))) return new Response('unauthorized', { status: 401 });
  let p: RetellWebhook;
  try { p = JSON.parse(raw) as RetellWebhook; } catch { return new Response('bad json', { status: 400 }); }
  if (!p?.call?.call_id || typeof p.event !== 'string') return new Response('bad payload', { status: 400 });
  // Keep every verified body for debugging, replay and golden-run capture (raw_webhooks is never served by any route).
  await q(`insert into raw_webhooks (provider, event_key, signature_ok, payload) values ('retell', $1, true, $2::jsonb) on conflict do nothing`,
    [`${p.call.call_id}:${p.event}:${createHash('sha1').update(raw).digest('hex').slice(0, 12)}`, raw]);
  // Work in the request so a failure returns 5xx and Retell retries (handlers are idempotent). The decision itself is a few queries.
  await processRetellWebhook(makeVoiceCtx(q, emitVoice), p);
  return new Response(null, { status: 204 });
}
