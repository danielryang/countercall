// GET /api/audit/verify: the system checks its own log. Recomputes the hash chain (db/003_audit_chain.sql) and rebuilds every case's status
// from the log (lib/audit.ts). Public when PUBLIC_READ=1, like /api/events (it reveals only counts, seqs, states and hashes).
// 200 AuditReport (a broken chain is still 200 with ok:false) | 401 | 503 {error:'unavailable'} when the database cannot be read.
// Before 003 is applied: chain is {installed:false} and the replay check still runs.
import { readAllowed } from '@/lib/auth';
import { verifyAudit, type AuditReport } from '@/lib/audit';
import { q } from '@/lib/store';

export const maxDuration = 15;
const NO_STORE = { 'Cache-Control': 'no-store' };
// Coalesce bursts (the UI polls when the event stream advances): at most one verification per 5 s per instance. A failure is never memoized.
let memo: { at: number; p: Promise<AuditReport> } | null = null;

export async function GET(req: Request) {
  if (!readAllowed(req)) return new Response('unauthorized', { status: 401, headers: NO_STORE });
  if (!memo || Date.now() - memo.at > 5000) {
    const p = verifyAudit(q);
    memo = { at: Date.now(), p };
    p.catch(() => { if (memo?.p === p) memo = null; });
  }
  try { return Response.json(await memo.p, { headers: NO_STORE }); }
  catch (err) { console.error('audit verify failed', err); return Response.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE }); }
}
