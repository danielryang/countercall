// lib/ratelimit.ts: thin wrapper over the SQL fixed-window counter rate_limit_hit() (db/001_schema.sql).
import { sql } from './store';

/** Increments the bucket and returns the hit count in the current window. */
export async function hit(bucket: string, windowSeconds: number): Promise<number> {
  const [r] = await sql`select rate_limit_hit(${bucket}, ${windowSeconds}) as n`;
  return Number(r.n);
}
/** True if this hit is still within `max` for the window. */
export const allow = async (bucket: string, windowSeconds: number, max: number) => (await hit(bucket, windowSeconds)) <= max;
