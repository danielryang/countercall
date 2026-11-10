// lib/sim/run.ts: deterministic simulation testing for the voice path. One seed => a world: 1-3 calls (random scenarios) whose Retell traffic is passed
// through a hostile network (drops, duplicates, delay + reorder, concurrent windows) plus forged deliveries, driven into the REAL route functions
// (lib/voice/endpoints.ts) over the REAL schema (PGlite). Then invariants are checked. A failing seed replays identically: `npm run sim -- --seed N`.
import { Retell } from 'retell-sdk';
import { startCall } from '../call';
import { TRANSITIONS } from '../policy/lifecycle';
import type { CaseState } from '../events';
import type { testDb } from '../testing/pglite';
import { makeVoiceCtx } from '../voice/ctx';
import { toolEndpoint, webhookEndpoint, type EndpointDeps } from '../voice/endpoints';
import type { VoiceCtx } from '../voice/handle';
import { reapStaleCalls } from '../voice/reap';
import { verifyRetell } from '../voice/retell';
import { SCENARIOS, type Scenario } from '../voice/scenarios';
import { prng, type Rng } from './prng';

export type SimDb = Awaited<ReturnType<typeof testDb>>;
/** A deliberately broken system, used to prove the simulator catches real bugs. */
export interface Mutation { name: string; verify?: EndpointDeps['verify']; wrapCtx?: (ctx: VoiceCtx) => VoiceCtx; reap?: typeof reapStaleCalls }
export interface SeedResult { seed: number; regime: 'benign' | 'hostile'; cases: number; deliveries: number; forged: number; stuckBeforeReap: number; violations: string[] }

const API_KEY = 'key_sim_0123456789abcdef';
type Delivery = { caseIdx: number; path: '/api/retell/tool' | '/api/retell/webhook'; body: string; label: string };
type Outcome = { callId: string; decision: { outcome: string; reason: string } };

const request = (path: string, body: string, sig: string | null) =>
  new Request('http://sim.local' + path, { method: 'POST', body, headers: { 'content-type': 'application/json', ...(sig ? { 'x-retell-signature': sig } : {}) } });

export async function runSeed(db: SimDb, seed: number, mutation?: Mutation): Promise<SeedResult> {
  process.env.RETELL_API_KEY = API_KEY;
  const rng = prng(seed);
  const regime: SeedResult['regime'] = rng.chance(0.3) ? 'benign' : 'hostile';
  const v: string[] = [];
  const note = (m: string) => { if (v.length < 8) v.push(m); };

  // ---- world: 1-3 calls, each a random scenario, all open at once (the real in-flight guard is bypassed only by reopening rows below)
  const n = rng.int(1, 3);
  const world: { caseId: string; callId: string; scenario: Scenario; expectedLast4: string }[] = [];
  for (let i = 0; i < n; i++) {
    const caseId = await db.heldCase('v_acme', '4321');
    const callId = `sim${seed}_${i}`;
    const r = await startCall({ q: db.q, emit: (e) => db.emit(e), createTask: db.createTask, callsEnabled: true, perVendorHourLimit: 1e6, globalHourLimit: 1e6, dial: async () => callId }, caseId, 'v_acme', { vendorName: 'Acme Corp', requestSummary: 'x' });
    if (!r.started) { note(`setup: startCall refused: ${r.reason}`); continue; }
    await db.q(`update calls set ended_at = now() where retell_call_id = $1`, [callId]);   // lets the next case start (global in-flight guard); reopened below
    const [{ challenge_expected }] = await db.q<{ challenge_expected: string }>(`select challenge_expected from cases where id = $1`, [caseId]);
    world.push({ caseId, callId, scenario: rng.pick(SCENARIOS), expectedLast4: challenge_expected });
  }
  await db.q(`update calls set ended_at = null where retell_call_id = any($1)`, [world.map((w) => w.callId)]);

  // ---- deliveries (signed exactly as Retell would)
  const sign = (body: string) => Retell.sign(body, API_KEY);
  const queues: Delivery[][] = [];
  for (const [caseIdx, w] of world.entries()) {
    queues.push(w.scenario.build({ caseId: w.caseId, callId: w.callId, expectedLast4: w.expectedLast4 }).map((s, k) => {
      const isTool = s.kind === 'tool';
      return { caseIdx, path: isTool ? '/api/retell/tool' as const : '/api/retell/webhook' as const, body: JSON.stringify(s.payload),
        label: isTool ? `tool:${(s.payload as { name: string }).name}#${k}` : (s.payload as { event: string }).event };
    }));
  }

  // ---- deps under test (optionally mutated)
  const baseCtx = makeVoiceCtx(db.q, (e) => db.emit(e));
  const ctx = mutation?.wrapCtx ? mutation.wrapCtx(baseCtx) : baseCtx;
  const deps: EndpointDeps = { ctx, verify: mutation?.verify ?? verifyRetell,
    recordRaw: async (key, raw) => { await db.q(`insert into raw_webhooks (provider, event_key, signature_ok, payload) values ('retell',$1,true,$2::jsonb) on conflict do nothing`, [key, raw]); } };
  const statuses: number[] = [];
  const deliver = async (path: string, body: string, sig: string | null): Promise<number> => {
    try {
      const res = await (path.endsWith('/tool') ? toolEndpoint : webhookEndpoint)(request(path, body, sig), deps);
      statuses.push(res.status); return res.status;
    } catch (err) { statuses.push(500); note(`handler threw on ${path}: ${(err as Error).message}`); return 500; }
  };
  const snapshot = async () => JSON.stringify([
    (await db.q<{ n: number }>(`select count(*)::int n from events`))[0].n, (await db.q<{ n: number }>(`select count(*)::int n from call_tool_calls`))[0].n,
    (await db.q<{ n: number }>(`select count(*)::int n from calls where outcome is not null`))[0].n, (await db.q<{ n: number }>(`select count(*)::int n from raw_webhooks`))[0].n]);

  // ---- phase A: forged deliveries against a quiet system must be rejected and must write nothing
  let forged = 0;
  if (world.length && (regime === 'hostile' || rng.chance(0.5))) {
    const sample = rng.pick(queues.flat());
    const good = await sign(sample.body);
    const forgeries: [string, string, string | null][] = [
      ['missing signature', sample.body, null], ['garbage signature', sample.body, 'v=1,d=deadbeef'],
      ['tampered body (1 extra byte)', sample.body + ' ', good], ['signed with another key', sample.body, await Retell.sign(sample.body, 'key_other_0123456789abcdef')],
      ['signature of a different body', sample.body, await sign(sample.body.replace('call_id', 'call_ld'))],
    ];
    for (const [kind, body, sig] of forgeries) {
      const before = await snapshot(); forged++;
      const st = await deliver(sample.path, body, sig);
      if (st !== 401) note(`forged delivery (${kind}) returned ${st}, want 401`);
      if ((await snapshot()) !== before) note(`forged delivery (${kind}) wrote to the database`);
    }
  }

  // ---- phase B: the hostile (or benign) network
  let schedule: Delivery[] = [];
  if (regime === 'benign') {   // honest network: cases interleave, but each call's own order is preserved and nothing is lost
    const qs = queues.map((q) => [...q]);
    while (qs.some((q) => q.length)) schedule.push(rng.pick(qs.filter((q) => q.length)).shift()!);
  } else {
    const jitter = rng.pick([3, 10, 40]);
    const timed: { t: number; d: Delivery }[] = [];
    for (const q of queues) q.forEach((d, i) => {
      const dropP = d.path.endsWith('/tool') ? 0.08 : 0.12;
      if (rng.chance(dropP)) return;                                        // lost for good (all retries failed)
      timed.push({ t: i + rng.int(0, jitter), d });
      if (rng.chance(0.3)) for (let c = rng.int(1, 2); c > 0; c--) timed.push({ t: i + rng.int(0, jitter * 2), d });   // retries / duplicate deliveries
    });
    schedule = timed.sort((a, b) => a.t - b.t).map((x) => x.d);
  }
  const delivered = new Set<string>();       // `${caseIdx}|${label}` that got a 2xx at least once
  const window = regime === 'benign' ? 1 : rng.pick([1, 2, 4]);             // concurrent in-flight deliveries
  for (let i = 0; i < schedule.length; i += window) {
    await Promise.all(schedule.slice(i, i + window).map(async (d) => {
      const st = await deliver(d.path, d.body, await sign(d.body));
      if (st >= 200 && st < 300) delivered.add(`${d.caseIdx}|${d.label}`);
    }));
  }
  if (statuses.some((s) => s >= 500)) note('a handler returned 5xx');

  // ---- invariants
  const ids = world.map((w) => w.caseId);
  const stuck = async () => (await db.q<{ id: string }>(`select id from cases where id = any($1) and state = 'calling'`, [ids])).length;
  const stuckBeforeReap = ids.length ? await stuck() : 0;

  if (regime === 'benign' && stuckBeforeReap) note(`benign network left ${stuckBeforeReap} case(s) in calling`);
  // The liveness backstop: whatever was lost, the reaper settles it by policy.
  if (ids.length) await (mutation?.reap ?? reapStaleCalls)({ q: db.q, ctx, createTask: db.createTask }, 0);
  const settled = ids.length ? await db.q<{ id: string; state: string }>(`select id, state from cases where id = any($1)`, [ids]) : [];
  const final = new Map(settled.map((c) => [c.id, c.state as CaseState]));
  const finalEvents = ids.length ? await db.q<{ case_id: string; type: string; payload: Record<string, unknown> }>(`select case_id, type, payload from events where case_id = any($1) order by seq`, [ids]) : [];

  for (const [i, w] of world.entries()) {
    const outs = finalEvents.filter((e) => e.case_id === w.caseId && e.type === 'call.outcome').map((e) => e.payload as unknown as Outcome);
    const got = (label: string) => delivered.has(`${i}|${label}`);
    const has = (prefix: string) => [...delivered].some((k) => k.startsWith(`${i}|${prefix}`));
    if (outs.length > 1) note(`case ${i} (${w.scenario.name}): ${outs.length} outcomes for one call`);
    if (outs.length !== 1) note(`case ${i} (${w.scenario.name}): no outcome after the reaper`);
    const o = outs[0]; if (!o) continue;
    if (o.callId !== w.callId) note(`case ${i}: outcome carries another call's id (${o.callId})`);
    const G = w.scenario.expected;
    if (o.decision.outcome !== G.outcome && o.decision.outcome !== 'UNVERIFIED') note(`case ${i} (${w.scenario.name}): outcome ${o.decision.outcome} is neither ground truth ${G.outcome} nor UNVERIFIED`);
    if (o.decision.outcome === 'CONFIRMED_LEGIT') {   // money may only be offered to a human if everything it rests on actually arrived
      if (!(has('tool:report_answer') && has('tool:report_challenge') && got('call_analyzed'))) note(`case ${i}: CONFIRMED_LEGIT without the answer, the challenge and the analysis all delivered`);
      if (G.outcome !== 'CONFIRMED_LEGIT') note(`case ${i} (${w.scenario.name}): CONFIRMED_LEGIT for a scenario whose truth is ${G.outcome}`);
    }
    if (regime === 'benign' && (o.decision.outcome !== G.outcome || o.decision.reason !== G.reason || final.get(w.caseId) !== G.state)) note(`case ${i} (${w.scenario.name}): honest network gave ${o.decision.outcome}/${o.decision.reason} -> ${final.get(w.caseId)}, want ${G.outcome}/${G.reason} -> ${G.state}`);
    const [call] = await db.q<{ outcome: string | null; ended_at: string | null }>(`select outcome, ended_at from calls where retell_call_id = $1`, [w.callId]);
    if (call.outcome !== o.decision.outcome || !call.ended_at) note(`case ${i}: calls row (${call.outcome}, ended=${!!call.ended_at}) disagrees with the outcome event`);
    // the state chain: every transition legal, contiguous, and ending at the stored state
    const chain = finalEvents.filter((e) => e.case_id === w.caseId && e.type === 'case.state').map((e) => e.payload as unknown as { from: CaseState; to: CaseState });
    let cur: CaseState = 'held';
    for (const s of chain) { if (s.from !== cur || !TRANSITIONS[s.from].includes(s.to)) { note(`case ${i}: illegal or non-contiguous transition ${s.from} -> ${s.to} (expected from ${cur})`); break; } cur = s.to; }
    if (cur !== final.get(w.caseId)) note(`case ${i}: replayed state ${cur} != stored ${final.get(w.caseId)}`);
  }
  if (finalEvents.some((e) => e.type === 'payment.released')) note('a payment.released event exists: nothing in the voice path may produce one');
  if ([...final.values()].includes('released')) note('a case reached released');
  if ([...final.values()].includes('calling')) note('a case is still in calling after the reaper');
  if (finalEvents.some((e) => /\+\d{10,15}/.test(JSON.stringify(e.payload)))) note('a full phone number appears in an event payload');
  return { seed, regime, cases: world.length, deliveries: schedule.length, forged, stuckBeforeReap, violations: v };
}

export type { Rng };
