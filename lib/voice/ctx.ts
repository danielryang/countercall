// lib/voice/ctx.ts: build the VoiceCtx for any driver. Production passes postgres.js (lib/store.ts); tests and simulation pass PGlite.
import { makeCaseStore } from '../casestore';
import type { Q } from '../sink';
import type { CallEvent } from './events';
import type { VoiceCtx } from './handle';

export const makeVoiceCtx = (q: Q, emit: (e: CallEvent) => Promise<unknown>): VoiceCtx => ({
  store: makeCaseStore(q),
  emit,
  async markEnded(callId, reason) {
    await q(`update calls set ended_at = coalesce(ended_at, now()), disconnection_reason = coalesce(disconnection_reason, $2) where retell_call_id = $1`, [callId, reason ?? null]);
  },
});
