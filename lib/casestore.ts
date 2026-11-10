// lib/casestore.ts: 01's CaseStore on our schema, written against the driver-agnostic Q so the same code runs on postgres.js (production)
// and PGlite (tests, simulation). `getExpectedLast4` is the ONLY reader of the server-side challenge secret.
import type { Q } from './sink';
import type { CaseStore } from './voice/finalize';

export const makeCaseStore = (q: Q): CaseStore => ({
  async getExpectedLast4(caseId) {
    const [r] = await q<{ challenge_expected: string | null }>(`select challenge_expected from cases where id = $1`, [caseId]);
    // No challenge recorded => '' => decideOutcome() returns UNVERIFIED/NO_RESULT. Fail closed AND decided, so the case lands on a human instead of hanging in `calling`.
    return r?.challenge_expected?.trim() ?? '';
  },
  async addToolCall(_caseId, callId, key, name, args) {
    await q(`insert into call_tool_calls (retell_call_id, key, name, args) values ($1, $2, $3, $4::text::jsonb)
             on conflict (retell_call_id, key) do update set args = excluded.args`, [callId, key, name, JSON.stringify(args)]);
  },
  async getToolCalls(callId) {
    const rows = await q<{ name: string; args: Record<string, unknown> }>(`select name, args from call_tool_calls where retell_call_id = $1 order by created_at, key`, [callId]);
    return rows.map((r) => ({ name: r.name, args: r.args }));
  },
  async saveOutcome(caseId, callId, d) {   // the idempotence gate: false means "already decided, or no such call row"
    const r = await q(`update calls set outcome = $1, reason = $2, decision = $3::text::jsonb, ended_at = coalesce(ended_at, now())
                       where retell_call_id = $4 and case_id = $5 and outcome is null returning id`, [d.outcome, d.reason, JSON.stringify(d), callId, caseId]);
    return r.length === 1;
  },
});
