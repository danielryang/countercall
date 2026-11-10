// lib/preflight-run.ts: gathers the preflight facts (booleans and counts only, never a value) and builds the checks.
// One source for GET /api/demo/preflight and `npm run preflight`, so the panel and the CLI can never disagree.
import { env } from './env';
import { buildChecks, summarize, type Check } from './preflight';
import type { Q } from './sink';

const has = (k: string) => !!process.env[k];

export interface PreflightReport { checks: Check[]; ready: boolean; fails: number; warns: number; rampMode: 'mock' | 'sandbox'; callsEnabled: boolean; allowedNumbers: number }

export async function runPreflight(q: Q): Promise<PreflightReport> {
  const e = env();
  let dbOk = false; let lastSeq: number | null = null; let openCases = 0;
  try {
    const [r] = await q<{ last: number | null }>(`select max(seq)::int as last from events`);
    const [o] = await q<{ n: number }>(`select count(*)::int as n from cases where state not in ('cleared','released','closed') and archived_at is null`);
    dbOk = true; lastSeq = r?.last ?? 0; openCases = o?.n ?? 0;
  } catch (err) { console.error('preflight db', err); }
  const allowedNumbers = (process.env.ALLOWED_DEMO_NUMBERS ?? '').split(',').filter((x) => x.trim()).length;
  const checks = buildChecks({
    dbOk, lastSeq, openCases, callsEnabled: e.CALLS_ENABLED, rampMode: e.RAMP_MODE,
    allowedNumbers, allowedSenders: e.INBOUND_ALLOWED_SENDERS.length,
    has: { anthropic: has('ANTHROPIC_API_KEY'), retellKey: has('RETELL_API_KEY'), retellAgent: has('RETELL_AGENT_ID'), retellFrom: has('RETELL_FROM_NUMBER'), agentmailKey: has('AGENTMAIL_API_KEY'), agentmailSecret: has('AGENTMAIL_WEBHOOK_SECRET') },
  });
  return { checks, ...summarize(checks), rampMode: e.RAMP_MODE as 'mock' | 'sandbox', callsEnabled: e.CALLS_ENABLED, allowedNumbers };
}
