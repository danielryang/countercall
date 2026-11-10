import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resetDemo } from './demo';
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
