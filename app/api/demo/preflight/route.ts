// GET /api/demo/preflight: readiness checks for the presenter. Session + DEMO_ENABLED, else 404. Facts are booleans and counts only.
import { sessionOf } from '@/lib/auth';
import { env } from '@/lib/env';
import { buildChecks, summarize } from '@/lib/preflight';
import { q } from '@/lib/store';

export const maxDuration = 15;
const has = (k: string) => !!process.env[k];

export async function GET(req: Request) {
  const e = env();
  if (!e.DEMO_ENABLED) return new Response('not found', { status: 404 });
  if (!sessionOf(req)) return new Response('unauthorized', { status: 401 });
  let dbOk = false; let lastSeq: number | null = null; let openCases = 0;
  try {
    const [r] = await q<{ last: number | null }>(`select max(seq)::int as last from events`);
    const [o] = await q<{ n: number }>(`select count(*)::int as n from cases where state not in ('cleared','released','closed') and archived_at is null`);
    dbOk = true; lastSeq = r?.last ?? 0; openCases = o?.n ?? 0;
  } catch (err) { console.error('preflight db', err); }
  const checks = buildChecks({
    dbOk, lastSeq, openCases, callsEnabled: e.CALLS_ENABLED, rampMode: e.RAMP_MODE,
    allowedNumbers: (process.env.ALLOWED_DEMO_NUMBERS ?? '').split(',').filter((x) => x.trim()).length, allowedSenders: e.INBOUND_ALLOWED_SENDERS.length,
    has: { anthropic: has('ANTHROPIC_API_KEY'), retellKey: has('RETELL_API_KEY'), retellAgent: has('RETELL_AGENT_ID'), retellFrom: has('RETELL_FROM_NUMBER'), agentmailKey: has('AGENTMAIL_API_KEY'), agentmailSecret: has('AGENTMAIL_WEBHOOK_SECRET') },
  });
  return Response.json({ checks, ...summarize(checks) }, { headers: { 'cache-control': 'no-store' } });
}
