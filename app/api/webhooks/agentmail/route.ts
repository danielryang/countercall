// app/api/webhooks/agentmail/route.ts  (PRIMARY ingestion)
import { after, type NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { handleAgentMailEvent } from '@/lib/detect/agentmail';
import { getDeps } from '@/lib/detect/deps';

export const runtime = 'nodejs';
export const maxDuration = 60; // LLM call + hold + emits; AgentMail only waits 15 s for our 2xx, so we answer first and work in after()

export async function POST(req: NextRequest) {
  const raw = await req.text(); // svix signs the EXACT bytes. Never req.json() first.
  let evt: { event_type: string; event_id: string; message?: any };
  try {
    new Webhook(process.env.AGENTMAIL_WEBHOOK_SECRET!).verify(raw, Object.fromEntries(req.headers)); // throws unless svix-id/-timestamp (5 min tolerance)/-signature match
    evt = JSON.parse(raw); // svix >= 2 verify() returns void (the AgentMail docs' `const msg = wh.verify(...)` is the old 1.x API)
  } catch {
    return new Response('invalid signature', { status: 400 });
  }
  after(async () => {
    try { await handleAgentMailEvent(evt, await getDeps({ provider: 'agentmail', payload: evt })); }
    catch (err) { console.error('ingest failed', evt.event_id, err); } // AgentMail retries only on non-2xx; a failure here is logged, not retried. Alert on it.
  });
  return new Response(null, { status: 204 });
}
