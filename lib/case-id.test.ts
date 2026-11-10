import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testDb } from './testing/pglite';

// Found by the simulator at ~9,900 cases: lpad(n::text, 4, '0') truncates, so case 10000 became 'CC-1000' and collided with an existing id.
test('case ids stay unique and ordered past 9999', async () => {
  const t = await testDb();
  await t.q(`select setval('case_seq', 9997)`);
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) ids.push((await t.q<{ id: string }>(`insert into cases (source) values ('email') returning id`))[0].id);
  assert.deepEqual(ids, ['CC-9998', 'CC-9999', 'CC-10000', 'CC-10001', 'CC-10002']);
  assert.equal(new Set(ids).size, ids.length);
});
