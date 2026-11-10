import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, test } from 'node:test';
import type { EmittedEvent } from './events';
import { applyHolds, holdProblem, type HoldDeps } from './holds';
import { DbMockRampClient, type HoldClient } from './ramp.mock-db';

const db = new PGlite();
const file = (f: string) => readFileSync(new URL(`../db/${f}`, import.meta.url), 'utf8');
const q: HoldDeps['q'] = async (text, params = []) => (await db.query(text, params as never)).rows as never;

before(async () => {
  await db.exec('create role anon nologin; create role authenticated nologin;');
  await db.exec(file('001_schema.sql')); await db.exec(file('002_seed.sql'));
});
const newCase = async () => (await q<{ id: string }>(`insert into cases (source, vendor_id) values ('email','v_acme') returning id`))[0].id;
const deps = (ramp: HoldClient, events: EmittedEvent[]): HoldDeps => ({ q, ramp, mode: 'mock', emit: async (e) => void events.push(e) });
const statusOf = async (id: string) => (await q<{ s: string }>(`select ramp_status_summary s from bills where id = $1`, [id]))[0].s;

test('holds both Acme bills and the vendor, records holds, flips the mock bills to ON_HOLD', async () => {
  const caseId = await newCase(); const events: EmittedEvent[] = [];
  const r = await applyHolds(deps(new DbMockRampClient(q), events), caseId, 'v_acme', ['pay_8101', 'pay_8102']);
  assert.deepEqual(r.bills.map((b) => [b.paymentId, b.state, b.amountCents]), [['pay_8101', 'applied', 1240000], ['pay_8102', 'applied', 1240000]]);
  assert.equal(r.vendorHold, 'applied');
  assert.equal(holdProblem(r), false);
  assert.equal(await statusOf('pay_8101'), 'ON_HOLD');
  assert.equal(await statusOf('pay_7001'), 'PAYMENT_COMPLETED', 'paid history is untouched');
  assert.equal(events.filter((e) => e.type === 'ramp.call').length, 3);
  const holds = await q<{ scope: string; state: string }>(`select scope, state from holds where case_id = $1 order by scope, bill_id`, [caseId]);
  assert.deepEqual(holds.map((h) => `${h.scope}:${h.state}`), ['bill:applied', 'bill:applied', 'vendor:applied']);
});

test('is idempotent per case: a second run adds no hold rows', async () => {
  const caseId = await newCase();
  const d = deps(new DbMockRampClient(q), []);
  await applyHolds(d, caseId, 'v_acme', ['pay_8101']); await applyHolds(d, caseId, 'v_acme', ['pay_8101']);
  assert.equal((await q<{ n: number }>(`select count(*)::int n from holds where case_id = $1`, [caseId]))[0].n, 2);
});

test('a 202 vendor hold is reported as pending and bills are still held (belt and braces)', async () => {
  const caseId = await newCase();
  const r = await applyHolds(deps(new DbMockRampClient(q, { vendorHoldNeedsApproval: true }), []), caseId, 'v_globex', ['pay_8201']);
  assert.equal(r.vendorHold, 'pending_ramp_approval');
  assert.equal(r.bills[0].state, 'applied');
  assert.equal(await statusOf('pay_8201'), 'ON_HOLD');
});

test('a failing Ramp is recorded as failed and flagged as a problem (fail closed)', async () => {
  const caseId = await newCase(); const events: EmittedEvent[] = [];
  const broken: HoldClient = { holdBill: async () => { throw new Error('boom'); }, holdVendor: async () => { throw new Error('boom'); }, releaseBill: async () => { throw new Error('x'); }, releaseVendor: async () => { throw new Error('x'); } };
  const r = await applyHolds(deps(broken, events), caseId, 'v_kestrel', ['pay_8501']);
  assert.equal(r.bills[0].state, 'failed'); assert.equal(r.vendorHold, 'failed'); assert.equal(holdProblem(r), true);
  assert.ok(events.every((e) => e.type !== 'ramp.call' || e.status === 599));
  const [h] = await q<{ state: string }>(`select state from holds where case_id = $1 and scope = 'bill'`, [caseId]);
  assert.equal(h.state, 'failed');
});
