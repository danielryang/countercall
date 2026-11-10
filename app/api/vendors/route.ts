// GET /api/vendors: the read-only vendor directory (numbers on file with provenance, bank on file, case and hold totals).
// Same read rule as /api/events (public when PUBLIC_READ=1, else the passcode session). Phones masked, no secret columns: lib/vendors.ts.
import { readAllowed } from '@/lib/auth';
import { q } from '@/lib/store';
import { listVendors } from '@/lib/vendors';

export const maxDuration = 15;
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  if (!readAllowed(req)) return new Response('unauthorized', { status: 401, headers: NO_STORE });
  try {
    return Response.json({ vendors: await listVendors(q), serverTime: new Date().toISOString() }, { headers: NO_STORE });
  } catch (err) {
    console.error('vendors query failed', err);
    return Response.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
