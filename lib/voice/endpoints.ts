// lib/voice/endpoints.ts: the Retell route bodies as plain functions of (Request, deps). The Next routes call these with production deps; the
// simulation harness calls the SAME functions with synthetic requests, so what is fuzzed is exactly what runs in production.
import { createHash } from 'node:crypto';
import { processRetellWebhook, processToolCall, type RetellWebhook, type ToolPayload, type VoiceCtx } from './handle';

export interface EndpointDeps {
  ctx: VoiceCtx;
  verify: (raw: string, req: Request) => Promise<boolean>;             // signature check on the RAW body (verifyRetell in production)
  recordRaw?: (key: string, raw: string) => Promise<void>;             // raw_webhooks insert in production
}

export async function webhookEndpoint(req: Request, d: EndpointDeps): Promise<Response> {
  const raw = await req.text();                                        // never JSON.stringify(parsed): the signature is over the raw bytes
  if (!(await d.verify(raw, req))) return new Response('unauthorized', { status: 401 });
  let p: RetellWebhook;
  try { p = JSON.parse(raw) as RetellWebhook; } catch { return new Response('bad json', { status: 400 }); }
  if (!p?.call?.call_id || typeof p.event !== 'string') return new Response('bad payload', { status: 400 });
  await d.recordRaw?.(`${p.call.call_id}:${p.event}:${createHash('sha1').update(raw).digest('hex').slice(0, 12)}`, raw);
  // Done in the request so a failure returns 5xx and Retell retries (handlers are idempotent).
  await processRetellWebhook(d.ctx, p);
  return new Response(null, { status: 204 });
}

export async function toolEndpoint(req: Request, d: EndpointDeps): Promise<Response> {
  const raw = await req.text();
  if (!(await d.verify(raw, req))) return new Response('unauthorized', { status: 401 });
  let p: ToolPayload;
  try { p = JSON.parse(raw) as ToolPayload; } catch { return Response.json({ recorded: false }, { status: 400 }); }
  if (!p?.call?.call_id) return Response.json({ recorded: false }, { status: 400 });
  const r = await processToolCall(d.ctx, p);
  return Response.json(r.body, { status: r.status });
}
