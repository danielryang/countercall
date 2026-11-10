// lib/demo.ts: demo-only operations shared by the /api/demo routes and the CLI scripts. Nothing here is reachable without a session + DEMO_ENABLED.
import { getDeps } from './detect/deps';
import { FIXTURES, fixtureToEmail, replayExtract } from './detect/fixtures';
import { ingestEmail } from './detect/ingest';
import type { EmittedEvent } from './events';
import type { Q } from './sink';
import { emit, q, sql } from './store';

export const fixtureIds = () => FIXTURES.map((f) => f.id as string);

/** Run a fixture through the SAME ingestEmail() the webhook uses. The email is tagged source:'injector' (the UI labels it SIMULATED). */
export async function injectFixtureEmail(fixtureId: string, opts: { replay?: boolean } = {}): Promise<{ caseId: string | null }> {
  const f = FIXTURES.find((x) => x.id === fixtureId);
  if (!f) throw new Error(`unknown fixture ${fixtureId}`);
  const email = fixtureToEmail(f);
  const deps = await getDeps({ provider: 'injector', payload: { fixtureId } });
  await ingestEmail(email, opts.replay ? { ...deps, extract: replayExtract(f) } : deps);
  const [c] = await sql`select id from cases where email_provider_event_id = ${email.providerEventId}`;
  return { caseId: (c?.id as string | undefined) ?? null };
}

export interface DemoIo { q: Q; emit: (e: EmittedEvent) => Promise<unknown> }
const prod = (): DemoIo => ({ q, emit: (e) => emit(e) });

/** Archive (never delete) everything that is not seeded history, clear call limits, un-hold the mock Ramp, and tell the UI where to cut.
 *  Takes the query function so it runs on both drivers. Found by the first live run: a regex written as '\D' inside a JS template literal becomes 'D',
 *  so the case number cast failed; [^0-9] has no escape to lose. */
export async function resetDemo(io: DemoIo = prod()): Promise<{ keepThrough: number }> {
  await io.q(`update cases set archived_at = now() where source <> 'seed' and archived_at is null`);
  await io.q(`delete from rate_limits where bucket like 'call:%'`);
  await io.q(`update bills set ramp_status_summary = 'PAYMENT_SCHEDULED' where paid_at is null`);
  const [r] = await io.q<{ k: number | string }>(`select coalesce(max(regexp_replace(id, '[^0-9]', '', 'g')::int), 0) as k from cases where source = 'seed'`);
  const keepThrough = Number(r.k);
  await io.emit({ type: 'system.reset', caseId: null, keepThrough });
  return { keepThrough };
}
