import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testDb } from '../testing/pglite';
import { finalizeCall } from '../voice/finalize';
import { runSeed, type Mutation, type SeedResult, type SimDb } from './run';

const SEEDS = Number(process.env.SIM_SEEDS ?? 150);
const sweep = async (mutate?: (db: SimDb) => Mutation, seeds = SEEDS, start = 1) => {
  const db = await testDb(); const out: SeedResult[] = []; const mutation = mutate?.(db);
  for (let s = start; s < start + seeds; s++) out.push(await runSeed(db, s, mutation));
  return out;
};

test('the real system satisfies every invariant under drops, duplicates, reordering, concurrency and forgery', async () => {
  const results = await sweep();
  const bad = results.filter((r) => r.violations.length);
  assert.deepEqual(bad.map((r) => `seed ${r.seed}: ${r.violations.join('; ')}`), []);
  assert.ok(results.reduce((n, r) => n + r.deliveries, 0) > 1000 && results.reduce((n, r) => n + r.forged, 0) > 100, 'the sweep actually exercised the network model');
  assert.ok(results.some((r) => r.stuckBeforeReap > 0), 'the network model really does lose final webhooks (otherwise the reaper is untested)');
});

test('a seed replays identically in a fresh database (failures are reproducible)', async () => {
  const a = await sweep(undefined, 8, 40); const b = await sweep(undefined, 8, 40);
  assert.deepEqual(a, b);
});

// Mutation tests: the simulator must FAIL on plausible bugs. Without these it would prove nothing.
const mutants: Record<string, (db: SimDb) => Mutation> = {
  'signature check disabled': () => ({ name: 'noverify', verify: async () => true }),
  'tool calls are not scoped to their call (cross-contamination between concurrent calls)': (db) => ({ name: 'leaky', wrapCtx: (ctx) => ({ ...ctx,
    store: { ...ctx.store, getToolCalls: async () => (await db.q<{ name: string; args: Record<string, unknown> }>(`select name, args from call_tool_calls order by created_at, key`)) } }) }),
  'a missing second reader / missing challenge / unsure is treated as agreement': () => ({ name: 'permissive', wrapCtx: (ctx) => ({ ...ctx, emit: async (e) => {
    if (e.type === 'call.outcome' && ['ANALYSIS_MISSING', 'CHALLENGE_NOT_GIVEN', 'UNSURE'].includes(e.decision.reason)) return ctx.emit({ ...e, decision: { ...e.decision, outcome: 'CONFIRMED_LEGIT', reason: 'CHALLENGE_MATCHED', paymentState: 'HELD_AWAITING_HUMAN_APPROVAL' } });
    return ctx.emit(e);
  } }) }),
  'no liveness backstop (reaper disabled)': () => ({ name: 'noreap', reap: async () => 0 }),
  'the ORIGINAL reaper bug: ignores calls whose call_ended arrived but whose analysis was lost': () => ({ name: 'oldreaper', reap: async (d, ms) => {
    const stale = await d.q<{ retell_call_id: string; case_id: string }>(`select retell_call_id, case_id from calls where ended_at is null and outcome is null and retell_call_id is not null and started_at <= now() - make_interval(secs => $1)`, [(ms ?? 0) / 1000]);
    for (const c of stale) await finalizeCall(d.ctx.store, c.case_id, c.retell_call_id, { disconnection_reason: 'max_duration_reached' }, d.ctx.emit);
    return stale.length;
  } }),
};
for (const [name, mutate] of Object.entries(mutants)) {
  test(`mutant caught: ${name}`, async () => {
    const caught = (await sweep(mutate, 300)).filter((r) => r.violations.length);
    assert.ok(caught.length > 0, `the simulator missed "${name}" across 300 seeds`);
  });
}
