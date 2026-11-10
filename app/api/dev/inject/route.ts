// app/api/dev/inject/route.ts - demo injector. Same pipeline as production (ingestEmail), different front door.
import type { NextRequest } from 'next/server';
import { handleAgentMailEvent } from '@/lib/detect/agentmail';
import { getDeps } from '@/lib/detect/deps';
import { FIXTURES, injectFixture } from '@/lib/detect/fixtures';

export const runtime = 'nodejs';
export const maxDuration = 60;
const allowed = (req: NextRequest) => !!process.env.DEMO_INJECT_KEY && req.headers.get('x-demo-key') === process.env.DEMO_INJECT_KEY;

export async function GET(req: NextRequest) { // list fixtures for the dashboard dropdown
  if (!allowed(req)) return new Response('not found', { status: 404 });
  return Response.json(FIXTURES.map((f) => ({ id: f.id, label: f.label })));
}

export async function POST(req: NextRequest) {
  if (!allowed(req)) return new Response('not found', { status: 404 }); // 404, not 401: do not advertise the route
  const body = await req.json() as { fixture?: string; replay?: boolean; agentmailEvent?: { event_type: string; event_id: string; message?: any } };
  if (body.agentmailEvent) return Response.json(await handleAgentMailEvent(body.agentmailEvent, getDeps())); // used by scripts/dev-ws.ts (no tunnel needed)
  if (!body.fixture) return new Response('fixture required', { status: 400 });
  return Response.json(await injectFixture(body.fixture, getDeps(), { replay: body.replay }));
}
