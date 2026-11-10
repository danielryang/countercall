// POST /api/retell/webhook: Node runtime. Logic lives in lib/voice/endpoints.ts (shared with the simulation harness). Retell times out at 10 s and retries 3x.
import { q } from '@/lib/store';
import { makeVoiceCtx } from '@/lib/voice/ctx';
import { webhookEndpoint } from '@/lib/voice/endpoints';
import { emit as emitVoice } from '@/lib/voice/events';
import { verifyRetell } from '@/lib/voice/retell';

export const maxDuration = 60;

export const POST = (req: Request) => webhookEndpoint(req, {
  ctx: makeVoiceCtx(q, emitVoice),
  verify: verifyRetell,
  // Keep every verified body for debugging, replay and golden-run capture (raw_webhooks is never served by any route).
  recordRaw: async (key, raw) => { await q(`insert into raw_webhooks (provider, event_key, signature_ok, payload) values ('retell', $1, true, $2::text::jsonb) on conflict do nothing`, [key, raw]); },
});
