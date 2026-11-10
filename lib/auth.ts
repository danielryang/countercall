// lib/auth.ts: passcode session. HMAC-signed cookie, HttpOnly, SameSite=Strict, 12 h. Every mutating route also checks Origin (CSRF).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env';

export const COOKIE = 'cc_session';
export const SESSION_SECONDS = 12 * 60 * 60;
export type Session = { n: string; exp: number };

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const mac = (data: string) => createHmac('sha256', env().SESSION_SECRET).update(data).digest('base64url');
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export const passcodeOk = (given: string) => safeEq(given, env().DEMO_PASSCODE);
export const validName = (n: unknown): n is string => typeof n === 'string' && /^[A-Za-z .,'-]{2,40}$/.test(n);

export function sign(name: string, now = Date.now()): string {
  const body = b64(JSON.stringify({ n: name, exp: now + SESSION_SECONDS * 1000 } satisfies Session));
  return `${body}.${mac(body)}`;
}
export function verify(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEq(sig, mac(body))) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    return typeof s.n === 'string' && typeof s.exp === 'number' && s.exp > now ? s : null;
  } catch { return null; }
}
export const cookieHeader = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
export const clearCookieHeader = (secure: boolean) => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
export const isSecureContext = () => process.env.NODE_ENV === 'production';

function readCookie(req: Request): string | undefined {
  return req.headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
}
export const sessionOf = (req: Request): Session | null => verify(readCookie(req));

/** CSRF guard for mutating routes: Origin must equal the request host, and the body must be JSON. */
export function sameOriginJson(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try { if (new URL(origin).host !== host) return false; } catch { return false; }
  return (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
}

/** For human/mutating routes. Returns the session, or a ready Response to send back. */
export function requireSession(req: Request): Session | Response {
  if (!sameOriginJson(req)) return new Response('bad origin or content-type', { status: 403 });
  return sessionOf(req) ?? new Response('unauthorized', { status: 401 });
}
/** For /api/demo/*: session AND DEMO_ENABLED, else 404 so the surface does not advertise itself. */
export function requireDemo(req: Request): Session | Response {
  if (!env().DEMO_ENABLED) return new Response('not found', { status: 404 });
  return requireSession(req);
}
/** For public reads: open when PUBLIC_READ=1, otherwise needs a session cookie. */
export const readAllowed = (req: Request) => env().PUBLIC_READ || sessionOf(req) !== null;
