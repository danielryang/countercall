// POST /api/auth {passcode, name} -> 204 + session cookie. DELETE clears it. Rate-limited: 5 attempts / 10 min / IP.
import { clearCookieHeader, cookieHeader, isSecureContext, passcodeOk, sameOriginJson, sign, validName } from '@/lib/auth';
import { allow } from '@/lib/ratelimit';

export const maxDuration = 15;
const ipOf = (req: Request) => (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();

export async function POST(req: Request) {
  if (!sameOriginJson(req)) return new Response('bad origin or content-type', { status: 403 });
  if (!(await allow('auth:' + ipOf(req), 600, 5))) return new Response('too many attempts', { status: 429 });
  const body = (await req.json().catch(() => null)) as { passcode?: unknown; name?: unknown } | null;
  if (!body || typeof body.passcode !== 'string' || !validName(body.name) || !passcodeOk(body.passcode)) return new Response('unauthorized', { status: 401 });
  return new Response(null, { status: 204, headers: { 'Set-Cookie': cookieHeader(sign(body.name), isSecureContext()) } });
}

export async function DELETE(req: Request) {
  if (!sameOriginJson(req)) return new Response('bad origin or content-type', { status: 403 });
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearCookieHeader(isSecureContext()) } });
}
