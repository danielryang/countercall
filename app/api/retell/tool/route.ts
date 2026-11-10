// POST /api/retell/tool: ONE endpoint for the three report-only tools. Answer in well under 1 s. Never reveals whether a challenge matched.
import { q } from '@/lib/store';
import { makeVoiceCtx } from '@/lib/voice/ctx';
import { toolEndpoint } from '@/lib/voice/endpoints';
import { emit as emitVoice } from '@/lib/voice/events';
import { verifyRetell } from '@/lib/voice/retell';

export const maxDuration = 15;

export const POST = (req: Request) => toolEndpoint(req, { ctx: makeVoiceCtx(q, emitVoice), verify: verifyRetell });
