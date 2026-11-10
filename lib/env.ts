// lib/env.ts: zod-validated environment, read lazily (never at module scope: `next build` imports every route and keys may be absent).
import { z } from 'zod';

const flag = (def: '0' | '1') => z.enum(['0', '1']).default(def).transform((v) => v === '1');
const list = z.string().default('').transform((s) => s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));

const Schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  DEMO_PASSCODE: z.string().min(4),
  PUBLIC_BASE_URL: z.string().url().optional(),
  RAMP_MODE: z.enum(['mock', 'sandbox']).default('mock'),   // 'prod' is rejected on purpose: this build never moves real money
  DEMO_ENABLED: flag('1'),
  PUBLIC_READ: flag('1'),
  CALLS_ENABLED: flag('0'),                                  // PLAN s13 H4: off unless a shoot or the live final needs it
  CALL_LIMIT_PER_VENDOR_HOUR: z.coerce.number().int().min(1).max(20).default(3),
  INBOUND_ALLOWED_SENDERS: list,                             // emails or bare domains; others are recorded but cannot hold or call
  AGENTMAIL_WEBHOOK_SECRET: z.string().optional(),
  RAMP_CLIENT_ID: z.string().optional(),
  RAMP_CLIENT_SECRET: z.string().optional(),
});
export type Env = z.infer<typeof Schema>;

let cached: Env | undefined;
/** Parses once per instance. Throws one error naming every missing/invalid variable. */
export function env(): Env {
  if (cached) return cached;
  const r = Schema.safeParse(process.env);
  if (!r.success) throw new Error('invalid environment: ' + r.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', '));
  return (cached = r.data);
}
/** Test hook: drop the cache so a changed process.env is re-read. */
export const resetEnvCache = () => { cached = undefined; };

/** Is this sender allowed to trigger a hold + callback? Entries are full addresses or bare domains. Empty list = nobody (fail closed). */
export function senderAllowed(address: string, allowed: readonly string[]): boolean {
  const a = address.toLowerCase();
  const domain = a.split('@')[1] ?? '';
  return allowed.some((x) => (x.includes('@') ? x === a : x === domain || domain.endsWith('.' + x)));
}
