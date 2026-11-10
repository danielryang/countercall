import assert from 'node:assert/strict';
import { test } from 'node:test';
import { injectFixtureEmail, resetDemo } from './demo';
import { makeDeps } from './detect/deps';
import { DbMockRampClient } from './ramp.mock-db';
import { testDb } from './testing/pglite';

test('reset archives live cases, keeps seeded history, frees held mock bills, and tells the UI where to cut', async () => {
  const t = await testDb();
  const io = { q: t.q, emit: (e: Parameters<typeof t.emit>[0]) => t.emit(e) };
  const mk = async (source: string) => (await t.q<{ id: string }>(`insert into cases (source, vendor_id) values ($1, 'v_acme') returning id`, [source]))[0].id;
  const seedA = await mk('seed'); const seedB = await mk('seed'); const live = await mk('email');
  await t.q(`update bills set ramp_status_summary = 'ON_HOLD' where vendor_id = 'v_acme' and paid_at is null`);

  const { keepThrough } = await resetDemo(io);

  assert.equal(keepThrough, Number(seedB.replace(/\D/g, '')), 'cut at the highest seeded case number (the 100-series ids; this is the bug the live run found)');
  const archived = async (id: string) => (await t.q<{ a: string | null }>(`select archived_at a from cases where id = $1`, [id]))[0].a;
  assert.equal(await archived(seedA), null); assert.equal(await archived(seedB), null);
  assert.ok(await archived(live), 'the live case is archived, not deleted');
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from bills where ramp_status_summary = 'ON_HOLD'`))[0].n, 0);
  const [ev] = (await t.events()).filter((e) => e.type === 'system.reset');
  assert.equal((ev.payload as { keepThrough: number }).keepThrough, keepThrough);
});

test('inject runs a fixture through the real pipeline as SIMULATED: bypasses the sender allowlist, holds, fails closed with calls off; reset then frees it', async () => {
  const t = await testDb();
  let dialed = 0;
  const deps = await makeDeps({ q: t.q, emit: (e) => t.emit(e) }, {
    rampMode: 'mock', ramp: new DbMockRampClient(t.q), callsEnabled: false, perVendorHourLimit: 1000, allowedSenders: ['nobody@example.invalid'],
    dial: async () => { dialed++; return 'never'; } }, { provider: 'injector', payload: { fixtureId: '01-obvious-bank-change-freemail' } });

  const { caseId } = await injectFixtureEmail('01-obvious-bank-change-freemail', { replay: true }, { deps, q: t.q });
  assert.ok(caseId, 'a case was created');
  const evs = await t.events(caseId);
  const received = evs.find((e) => e.type === 'email.received');
  assert.equal((received?.payload as { email: { source: string } }).email.source, 'injector', 'tagged as injected, so the UI can label it SIMULATED');
  assert.ok(evs.some((e) => e.type === 'payment.held'), 'the injector bypasses INBOUND_ALLOWED_SENDERS and may hold');
  assert.equal(dialed, 0, 'CALLS_ENABLED=0: nothing is dialed');
  const [c] = await t.q<{ state: string }>(`select state from cases where id = $1`, [caseId]);
  assert.equal(c.state, 'needs_human', 'calls off fails closed to a human task');
  assert.ok((await t.q<{ n: number }>(`select count(*)::int n from bills where ramp_status_summary = 'ON_HOLD'`))[0].n > 0);

  const { caseId: second } = await injectFixtureEmail('01-obvious-bank-change-freemail', { replay: true }, { deps, q: t.q });
  assert.ok(second && second !== caseId, 'every injection is a fresh email (new provider id), so the same fixture can be sent again after a reset');

  await resetDemo({ q: t.q, emit: (e) => t.emit(e) });
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from cases where id in ($1, $2) and archived_at is null`, [caseId, second]))[0].n, 0);
  assert.equal((await t.q<{ n: number }>(`select count(*)::int n from bills where ramp_status_summary = 'ON_HOLD'`))[0].n, 0);
  assert.equal(dialed, 0);
});

test('unknown fixture ids are refused before anything runs', async () => {
  await assert.rejects(() => injectFixtureEmail('nope', {}, { deps: {} as never, q: (async () => []) as never }), /unknown fixture/);
});
