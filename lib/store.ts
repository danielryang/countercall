// lib/store.ts: the one database client, the one `emit()`, and 01's CaseStore on our schema. Everything that writes events imports from here.
import postgres from 'postgres';
import { appendEvent } from './sink';
import type { EmittedEvent } from './events';
import { registerSink } from './voice/events';
import type { CaseStore } from './voice/finalize';

// Supabase transaction pooler: no prepared statements, one connection per serverless instance.
export const sql = postgres(process.env.DATABASE_URL ?? '', { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });

/** The only way an event enters the system. One transaction: event row, optional state change, optional `case.state` row. */
export const emit = (e: EmittedEvent, human?: string) =>
  sql.begin((tx) => appendEvent((text, params = []) => tx.unsafe(text, params as never) as never, e, human));

// 01's producers (webhook routes, finalizeCall) call their own `emit`; route it into the same writer, once, at module load.
registerSink(async (e) => { await emit(e); });

/** 01's CaseStore. `getExpectedLast4` is the ONLY reader of the server-side challenge secret. */
export const store: CaseStore = {
  async getExpectedLast4(caseId) {
    const [r] = await sql`select challenge_expected from cases where id = ${caseId}`;
    if (!r?.challenge_expected) throw new Error(`no challenge recorded for case ${caseId}`);   // fail closed: nothing gets decided
    return r.challenge_expected as string;
  },
  async addToolCall(_caseId, callId, key, name, args) {
    await sql`insert into call_tool_calls (retell_call_id, key, name, args)
              values (${callId}, ${key}, ${name}, ${sql.json(args as never)})
              on conflict (retell_call_id, key) do update set args = excluded.args`;
  },
  async getToolCalls(callId) {
    const rows = await sql`select name, args from call_tool_calls where retell_call_id = ${callId} order by created_at`;
    return rows.map((r) => ({ name: r.name as string, args: r.args as Record<string, unknown> }));
  },
  async saveOutcome(caseId, callId, d) {   // the idempotence gate: false means "already decided, this was a webhook retry"
    const r = await sql`update calls set outcome = ${d.outcome}, reason = ${d.reason}, decision = ${sql.json(d as never)}, ended_at = coalesce(ended_at, now())
                        where retell_call_id = ${callId} and case_id = ${caseId} and outcome is null returning id`;
    return r.length === 1;
  },
};
