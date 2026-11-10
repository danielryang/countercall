// lib/audit.test.ts: the hash-chained audit log (db/003_audit_chain.sql) and the event-sourcing replay check (lib/audit.ts), on PGlite.
// PGlite is ONE connection: concurrent emits are serialized, so the trigger's seq re-draw branch is covered deterministically (test 9)
// and the "burst" (test 10) is interleaving between transactions, not a cross-connection race.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { replayCases, replayLog, verifyAudit, verifyChain, type ReplayCaseRow, type ReplayEventRow } from './audit';
import type { EmittedEvent } from './events';
import { testDb } from './testing/pglite';

type T = Awaited<ReturnType<typeof testDb>>;
type Outcome = 'CONFIRMED_LEGIT' | 'DENIED_FRAUD' | 'UNVERIFIED';
const decision = (outcome: Outcome) => ({ outcome, reason: 'X', severity: 'low', challengeMatched: null, flags: [], paymentState: 'HELD' });

/** A held case reached THROUGH emit() (unlike heldCase(), which moves the row directly and therefore has no log to replay). */
async function emittedHeldCase(t: T, source = 'email'): Promise<string> {
  const [c] = await t.q<{ id: string }>(`insert into cases (source, vendor_id) values ($1, 'v_acme') returning id`, [source]);
  await t.emit({ type: 'case.flagged', caseId: c.id, decision: {} as never, spans: [] });
  await t.emit({ type: 'payment.held', caseId: c.id, vendorId: 'v_acme', paymentIds: ['pay_8101', 'pay_8102'] });
  return c.id;
}
const callCreated = (caseId: string, callId: string) => ({ type: 'call.created', caseId, callId, mode: 'phone', at: 0 }) as EmittedEvent;
const callOutcome = (caseId: string, callId: string, o: Outcome) => ({ type: 'call.outcome', caseId, callId, decision: decision(o), at: 0 }) as unknown as EmittedEvent;
const rampCall = (caseId: string, i = 0) => ({ type: 'ramp.call', caseId, mode: 'mock', method: 'POST', path: `/bills/${i}`, status: 200, ms: 3 }) as EmittedEvent;
const release = (caseId: string) => ({ type: 'payment.released', caseId, paymentIds: ['pay_8101', 'pay_8102'], rampBillIds: [null, null], approvedBy: 'A. Patel', note: null, destination: 'on_file' }) as EmittedEvent;
const count = async (t: T) => (await t.q<{ n: number }>(`select count(*)::int n from events`))[0].n;
const maxSeq = async (t: T) => (await t.q<{ n: number }>(`select max(seq)::int n from events`))[0].n;
const seqs = async (t: T) => (await t.q<{ seq: number }>(`select seq::int seq from events order by seq`)).map((r) => r.seq);
/** Tampering needs the append-only trigger out of the way, exactly as an attacker with DDL rights would do it. */
const tamper = async (t: T, sql: string, params: unknown[] = []) => {
  await t.db.exec(`alter table events disable trigger events_no_update_delete`);
  try { await t.q(sql, params); } finally { await t.db.exec(`alter table events enable trigger events_no_update_delete`); }
};
const installedChain = async (t: T) => { const c = await verifyChain(t.q); assert.ok(c.installed); return c; };

test('1. intact chain over a whole lifecycle + reset: every row checked, genesis has no prev, head is the last row', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  await t.emit(callCreated(id, 'c1')); await t.emit(callOutcome(id, 'c1', 'CONFIRMED_LEGIT')); await t.emit(release(id), 'A. Patel');
  await t.emit({ type: 'system.reset', caseId: null, keepThrough: 0 });
  assert.equal(await t.stateOf(id), 'released');
  const r = await verifyAudit(t.q);
  assert.equal(r.ok, true);
  assert.ok(r.chain.installed);
  if (!r.chain.installed) return;
  assert.equal(r.chain.intact, true); assert.equal(r.chain.checked, await count(t)); assert.equal(r.chain.preChain, 0); assert.equal(r.chain.preChainMaxSeq, 0);
  assert.equal(r.chain.breaks, 0); assert.equal(r.chain.firstBreak, null);
  assert.equal(r.chain.head?.seq, await maxSeq(t)); assert.match(r.chain.head?.hash ?? '', /^[0-9a-f]{64}$/);
  const [g] = await t.q<{ prev_hash: unknown; hash: unknown }>(`select prev_hash, hash from events order by seq limit 1`);
  assert.equal(g.prev_hash, null); assert.ok(g.hash);
  assert.equal(r.replay.mismatchCount, 0); assert.equal(r.replay.matched, r.replay.cases);
});

test('2. rows written before 003 are pre-chain: counted, not checked; a case spanning the boundary still replays', async () => {
  const t = await testDb({ chain: false });
  const id = await emittedHeldCase(t); await t.emit(rampCall(id));               // 5 rows: flagged, state, held, state, ramp.call
  assert.equal(await count(t), 5);
  await t.migrate('003_audit_chain.sql');
  await t.emit(callCreated(id, 'c1')); await t.emit(callOutcome(id, 'c1', 'DENIED_FRAUD')); await t.emit(rampCall(id, 1));   // 5 more
  const c = await installedChain(t);
  assert.equal(c.preChain, 5); assert.equal(c.checked, 5); assert.equal(c.intact, true); assert.equal(c.preChainMaxSeq, 5);
  const [a] = await t.q<{ p: number }>(`select pre_chain_max_seq::int p from events_chain_anchor`); assert.equal(a.p, 5);
  const r = await replayCases(t.q);
  assert.equal(r.mismatchCount, 0); assert.equal(await t.stateOf(id), 'fraud_blocked');
});

test('3. before 003: chain reports not installed, emit still works (and dedupes), ok reflects the replay only', async () => {
  const t = await testDb({ chain: false });
  assert.deepEqual(await verifyChain(t.q), { installed: false });
  const id = await emittedHeldCase(t);
  assert.ok((await t.emit(callCreated(id, 'c1'))) !== null);
  assert.equal(await t.emit(callCreated(id, 'c1')), null);
  const r1 = await verifyAudit(t.q);
  assert.deepEqual(r1.chain, { installed: false }); assert.equal(r1.ok, true);
  await t.heldCase();
  assert.equal((await verifyAudit(t.q)).ok, false);
});

test('4. an edited payload breaks that row: hash_mismatch at k', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t); await t.emit(rampCall(id)); await t.emit(rampCall(id, 2));
  const k = (await seqs(t))[2];
  await tamper(t, `update events set payload = jsonb_set(payload, '{paymentIds}', '["pay_9999"]') where seq = $1`, [k]);
  const c = await installedChain(t);
  assert.equal(c.intact, false); assert.equal(c.breaks, 1); assert.equal(c.firstBreak?.seq, k); assert.equal(c.firstBreak?.kind, 'hash_mismatch');
  assert.match(c.firstBreak?.expected ?? '', /^[0-9a-f]{64}$/); assert.notEqual(c.firstBreak?.expected, c.firstBreak?.found);
  assert.equal((await verifyAudit(t.q)).ok, false);
});

test('5. edit + recompute that row\'s seal: the NEXT row no longer links (link_mismatch at k+1)', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t); await t.emit(rampCall(id));
  const s = await seqs(t); const k = s[1];
  await tamper(t, `update events set payload = '{"from":"scanning","to":"held","cause":"case.flagged"}' where seq = $1`, [k]);
  await tamper(t, `update events set hash = sha256(coalesce(prev_hash, ''::bytea) || convert_to(events_canon(events), 'UTF8')) where seq = $1`, [k]);
  const c = await installedChain(t);
  assert.equal(c.firstBreak?.seq, s[2]); assert.equal(c.firstBreak?.kind, 'link_mismatch'); assert.equal(c.breaks, 1);
});

test('6. a deleted middle row: the next row links to a seal that no longer exists (expected/found in hex)', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t); await t.emit(rampCall(id));
  const rows = await t.q<{ seq: number; h: string }>(`select seq::int seq, encode(hash, 'hex') h from events order by seq`);
  await tamper(t, `delete from events where seq = $1`, [rows[2].seq]);
  const c = await installedChain(t);
  assert.deepEqual(c.firstBreak, { seq: rows[3].seq, kind: 'link_mismatch', expected: rows[1].h, found: rows[2].h });
});

test('7. a row inserted with the chain trigger disabled is reported unchained', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  await t.db.exec(`alter table events disable trigger events_chain_trg`);
  const [ins] = await t.q<{ seq: number }>(`insert into events (case_id, type, actor, payload) values ($1, 'ramp.call', 'policy', '{}') returning seq::int seq`, [id]);
  await t.db.exec(`alter table events enable trigger events_chain_trg`);
  await t.emit(rampCall(id));
  const c = await installedChain(t);
  assert.equal(c.firstBreak?.seq, ins.seq); assert.equal(c.firstBreak?.kind, 'unchained'); assert.equal(c.firstBreak?.expected, null);
});

test('8. the timestamp is sealed to the microsecond, and the session timezone never changes a seal', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  await t.db.exec(`set timezone = 'Asia/Kolkata'`);
  await t.emit(rampCall(id));
  assert.equal((await installedChain(t)).intact, true);
  await t.db.exec(`reset timezone`);
  assert.equal((await installedChain(t)).intact, true);
  const k = (await seqs(t))[1];
  await tamper(t, `update events set ts = ts + interval '1 microsecond' where seq = $1`, [k]);
  const c = await installedChain(t);
  assert.equal(c.firstBreak?.seq, k); assert.equal(c.firstBreak?.kind, 'hash_mismatch');
});

test('9. a seq drawn before an already-committed later seq is re-drawn, so seq order = chain order', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  const before = await maxSeq(t);
  const [r] = await t.q<{ seq: number }>(`insert into events (seq, case_id, type, actor) overriding system value values (0, $1, 'ramp.call', 'policy') returning seq::int seq`, [id]);
  assert.ok(r.seq > before, `stored seq ${r.seq} must be above ${before}`);
  await t.emit(rampCall(id));
  assert.equal((await installedChain(t)).intact, true);
});

test('10. a serialized burst of 40 emits over 4 cases with duplicates: chain intact, seqs increasing, every case replays', async () => {
  const t = await testDb();
  const ids = [await emittedHeldCase(t), await emittedHeldCase(t), await emittedHeldCase(t), await emittedHeldCase(t)];
  const evs: EmittedEvent[] = ids.flatMap((id, i) => [
    callCreated(id, `c${i}`), callCreated(id, `c${i}`),
    { type: 'call.status', caseId: id, callId: `c${i}`, status: 'connected', at: 0 } as EmittedEvent, { type: 'call.status', caseId: id, callId: `c${i}`, status: 'connected', at: 0 } as EmittedEvent,
    ...[0, 1, 2, 3, 4, 5].map((n) => rampCall(id, n)),
  ]);
  assert.equal(evs.length, 40);
  const res = await Promise.all(evs.map((e, i) => (i % 2 ? t.emit(e) : Promise.resolve().then(() => t.emit(e)))));
  assert.equal(res.filter((x) => x === null).length, 8);    // 4 duplicate call.created + 4 duplicate call.status
  const s = await seqs(t);
  assert.ok(s.every((v, i) => i === 0 || v > s[i - 1]));
  assert.equal((await installedChain(t)).intact, true);
  const r = await replayCases(t.q);
  assert.equal(r.mismatchCount, 0);
  for (const id of ids) assert.equal(await t.stateOf(id), 'calling');
});

test('11. appending under REPEATABLE READ is refused (a stale snapshot would fork the chain)', async () => {
  const t = await testDb();
  await assert.rejects(() => t.db.transaction(async (tx) => {
    await tx.query(`set transaction isolation level repeatable read`);
    await tx.query(`insert into events (type, actor) values ('ramp.call', 'policy')`);
  }), /READ COMMITTED/);
});

test('12. 003 is idempotent; the anchor is write-once; events stay append-only', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  const [a1] = await t.q<{ p: number; at: string }>(`select pre_chain_max_seq::int p, installed_at::text at from events_chain_anchor`);
  await t.migrate('003_audit_chain.sql');
  const [a2] = await t.q<{ p: number; at: string }>(`select pre_chain_max_seq::int p, installed_at::text at from events_chain_anchor`);
  assert.deepEqual(a2, a1);
  const [n] = await t.q<{ n: number }>(`select count(*)::int n from pg_trigger where tgname = 'events_chain_trg' and tgrelid = 'events'::regclass`);
  assert.equal(n.n, 1);
  await t.emit(rampCall(id));
  assert.equal((await installedChain(t)).intact, true);
  await assert.rejects(() => t.q(`update events set payload = '{}'`), /append-only/);
  await assert.rejects(() => t.q(`delete from events`), /append-only/);
  await assert.rejects(() => t.q(`update events_chain_anchor set pre_chain_max_seq = 999`), /write-once/);
  await assert.rejects(() => t.q(`delete from events_chain_anchor`), /write-once/);
  await assert.rejects(() => t.q(`truncate events_chain_anchor`), /write-once/);
});

test('13. replay: every lifecycle path rebuilds the same status the database holds', async () => {
  const t = await testDb();
  const a = await emittedHeldCase(t);                                            // held -> calling -> needs_human -> calling -> fraud_blocked -> released
  await t.emit(callCreated(a, 'a1')); await t.emit(callOutcome(a, 'a1', 'UNVERIFIED'));
  await t.emit(callCreated(a, 'a2')); await t.emit(callOutcome(a, 'a2', 'DENIED_FRAUD')); await t.emit(callOutcome(a, 'late', 'CONFIRMED_LEGIT'));
  await t.emit(release(a), 'A. Patel');
  const b = await emittedHeldCase(t); await t.emit({ type: 'case.closed', caseId: b, closedBy: 'A. Patel', note: 'vendor confirmed by email' }, 'A. Patel');
  const [c] = await t.q<{ id: string }>(`insert into cases (source) values ('email') returning id`);
  await t.emit({ type: 'case.cleared', caseId: c.id, decision: {} as never });
  const [d] = await t.q<{ id: string }>(`insert into cases (source) values ('email') returning id`);
  await t.emit({ type: 'task.created', caseId: d.id, taskId: 1, kind: 'review', title: 't', reason: 'r', assignee: 'AP lead' });
  const [e] = await t.q<{ id: string }>(`insert into cases (source) values ('email') returning id`);   // no events yet: still scanning
  await t.emit({ type: 'system.reset', caseId: null, keepThrough: 0 });
  assert.deepEqual([await t.stateOf(a), await t.stateOf(b), await t.stateOf(c.id), await t.stateOf(d.id), await t.stateOf(e.id)], ['released', 'closed', 'cleared', 'needs_human', 'scanning']);
  const r = await replayCases(t.q);
  assert.deepEqual(r.mismatches, []); assert.equal(r.matched, 5); assert.equal(r.cases, 5); assert.deepEqual(r.outOfBand, []);
});

test('14. a case moved without events (heldCase) is caught: the log says scanning, the row says held', async () => {
  const t = await testDb(); const id = await t.heldCase();
  const r = await replayCases(t.q);
  assert.equal(r.mismatchCount, 1);
  assert.deepEqual(r.mismatches[0], { caseId: id, db: 'held', replayed: 'scanning', projected: 'scanning', reason: 'final_state', atSeq: null });
});

test('15. a forged case.state row with no cause is caught at that row', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  const [f] = await t.q<{ seq: number }>(`insert into events (case_id, type, actor, payload) values ($1, 'case.state', 'policy', '{"from":"held","to":"calling"}') returning seq::int seq`, [id]);
  const r = await replayCases(t.q);
  assert.equal(r.mismatchCount, 1);
  assert.equal(r.mismatches[0].reason, 'transition_log'); assert.equal(r.mismatches[0].atSeq, f.seq);
  assert.equal(r.mismatches[0].projected, 'calling'); assert.equal(r.mismatches[0].db, 'held');
  assert.equal((await installedChain(t)).intact, true, 'the forged row went through the trigger: sealed, but the replay still catches it');
});

test('16. a demo_replay case that starts held out of band is reported as such, not as a mismatch', async () => {
  const t = await testDb();
  const [c] = await t.q<{ id: string }>(`insert into cases (source, vendor_id) values ('demo_replay', 'v_acme') returning id`);
  await t.q(`update cases set state = 'flagged' where id = $1`, [c.id]); await t.q(`update cases set state = 'held' where id = $1`, [c.id]);
  await t.emit(callCreated(c.id, 'r1')); await t.emit(callOutcome(c.id, 'r1', 'DENIED_FRAUD'));
  const r = await replayCases(t.q);
  assert.equal(r.mismatchCount, 0);
  assert.deepEqual(r.outOfBand, [{ caseId: c.id, source: 'demo_replay', startedAt: 'held' }]);
});

async function richDb() {
  const t = await testDb();
  const a = await emittedHeldCase(t); await t.emit(callCreated(a, 'a1')); await t.emit(callOutcome(a, 'a1', 'CONFIRMED_LEGIT')); await t.emit(release(a), 'A. Patel');
  const b = await emittedHeldCase(t); await t.emit(callCreated(b, 'b1')); await t.emit(callOutcome(b, 'b1', 'UNVERIFIED')); await t.emit(rampCall(b));
  await t.heldCase();
  return t;
}
const rawLog = async (t: T) => {
  const cases = await t.q<ReplayCaseRow>(`select id, state::text state, source from cases order by id`);
  const events = await t.q<ReplayEventRow>(`select seq::int seq, id::text id, ts::text ts, case_id, type, actor, payload from events where case_id is not null order by seq`);
  return { cases, events };
};

test('17. pure replayLog: legacy double-encoded (string) payloads replay the same as objects', async () => {
  const t = await richDb(); const { cases, events } = await rawLog(t);
  const asObjects = replayLog(cases, events);
  const asStrings = replayLog(cases, events.map((e) => ({ ...e, payload: JSON.stringify(e.payload) })));
  assert.deepEqual(asStrings, asObjects);
  assert.equal(asObjects.mismatchCount, 1);   // the heldCase() row
});

test('18. pure replayLog: a call.outcome whose payload lost its decision is an unreadable event, not a silent pass', () => {
  const ev = (seq: number, type: string, payload: unknown): ReplayEventRow => ({ seq, id: `e${seq}`, ts: '2026-11-10T00:00:00.000Z', case_id: 'CC-0100', type, actor: 'policy', payload });
  const r = replayLog([{ id: 'CC-0100', state: 'fraud_blocked', source: 'email' }], [
    ev(1, 'case.flagged', {}), ev(2, 'case.state', { from: 'scanning', to: 'flagged', cause: 'case.flagged' }),
    ev(3, 'payment.held', {}), ev(4, 'case.state', { from: 'flagged', to: 'held', cause: 'payment.held' }),
    ev(5, 'call.created', {}), ev(6, 'case.state', { from: 'held', to: 'calling', cause: 'call.created' }),
    ev(7, 'call.outcome', {}), ev(8, 'case.state', { from: 'calling', to: 'fraud_blocked', cause: 'call.outcome' }),
  ]);
  assert.equal(r.mismatchCount, 1);
  assert.equal(r.mismatches[0].reason, 'unreadable_event'); assert.equal(r.mismatches[0].atSeq, 7);
  const s = replayLog([{ id: 'CC-0100', state: 'scanning', source: 'email' }], [ev(1, 'email.received', '"not an object"')]);
  assert.equal(s.mismatches[0]?.reason, 'unreadable_event');
});

test('19. the slim query (payloads nextState never reads sent as {}) gives the same report as the full one', async () => {
  const t = await richDb();
  assert.deepEqual(await replayCases(t.q), await replayCases(t.q, { slim: false }));
});

test('20. perf: verifying 3,000 sealed rows stays well inside the route budget', async () => {
  const t = await testDb(); const id = await emittedHeldCase(t);
  await t.q(`insert into events (case_id, type, actor, payload) select $1, 'ramp.call', 'policy', jsonb_build_object('i', g) from generate_series(1, 3000) g`, [id]);
  const r = await verifyAudit(t.q);
  assert.ok(r.chain.installed && r.chain.intact && r.chain.checked === 3004, JSON.stringify(r.chain));
  assert.equal(r.replay.mismatchCount, 0);
  console.log(`# audit verify: ${r.chain.installed ? r.chain.checked : 0} rows in ${r.ms} ms`);
  assert.ok(r.ms < 3000, `took ${r.ms} ms`);
});
