// lib/sink.ts: the ONLY writer of `events`, and the only place a case changes state. Driver-agnostic: the caller passes a query
// function that is already inside a transaction (lib/store.ts: postgres.js `sql.begin`; scripts/db-check.ts: PGlite). Same code, both.
import { toRow, type CaseState, type EmittedEvent } from './events';
import { nextState } from './policy/lifecycle';

export type Q = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

/** Returns the new event's seq, or null when this exact delivery (same idem_key) was already processed: a duplicate has no side effects. */
export async function appendEvent(q: Q, e: EmittedEvent, human?: string): Promise<number | null> {
  const row = toRow(e, human);
  const [ins] = await q<{ seq: string | number }>(
    `insert into events (case_id, type, actor, idem_key, payload) values ($1, $2, $3, $4, $5::text::jsonb)
     on conflict (idem_key) do nothing returning seq`,
    [row.case_id, row.type, row.actor, row.idem_key, JSON.stringify(row.payload)]);
  if (!ins) return null;
  if (!row.case_id) return Number(ins.seq);

  const [c] = await q<{ state: CaseState }>(`select state from cases where id = $1 for update`, [row.case_id]);
  const to = c ? nextState(e, c.state) : null;
  // fail closed: a release event that cannot move the case to `released` is a bug upstream. Throwing rolls the whole transaction back,
  // so no `payment.released` row can ever exist for a case that was not releasable.
  if (e.type === 'payment.released' && !to) throw new Error(`release refused: case ${row.case_id} is ${c?.state ?? 'missing'}`);
  if (c && to) {
    await q(
      `update cases set state = $2::case_state,
         released_by = case when $2::text = 'released' then $3 else released_by end,
         released_at = case when $2::text = 'released' then now() else released_at end
       where id = $1`, [row.case_id, to, row.actor]);
    await q(`insert into events (case_id, type, actor, payload) values ($1, 'case.state', 'policy', $2::text::jsonb)`,
      [row.case_id, JSON.stringify({ from: c.state, to, cause: e.type })]);
  }
  return Number(ins.seq);
}
