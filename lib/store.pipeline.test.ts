// lib/store.pipeline.test.ts: the store never has two statements in flight on its connection. Found live (2026-11-10): the transaction
// pooler answered only the first of two pipelined statements, postgres.js handed every later statement the previous one's rows
// ("v.domains is not iterable", "events is not iterable") and the last one hung until the next request. The fake pooler drops exactly
// like that, so this fails (wrong rows or a hang) if any store entry point (q, sql``, sql.unsafe, tx, emit's begin) pipelines again.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startFakePooler } from './testing/fake-pooler';

test('concurrent statements on the store client: each gets its own rows, none dropped, none hang', async () => {
  const pooler = await startFakePooler();
  process.env.DATABASE_URL = pooler.url;   // lib/store.ts reads it at import (node --test runs each file in its own process)
  const { q, sql, tx } = await import('./store');
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('a statement never got an answer (pipelined and dropped)')), 3000).unref());
  try {
    // Queued during connect and then flushed together: this is the cold-start burst of the /vendors page (events, audit, vendors).
    const [a, b, c, d, e] = await Promise.race([Promise.all([
      q<{ a: string }>(`select 1 as a`),
      q<{ b: string }>(`select 2 as b`),
      sql`select 3 as c`,
      tx(async (t) => (await t<{ d: string }>(`select 4 as d`))[0]),
      sql.unsafe(`select 5 as e`),
    ]), timeout]);
    assert.deepEqual([a[0], b[0], c[0], d, e[0]], [{ a: '1' }, { b: '2' }, { c: '3' }, { d: '4' }, { e: '5' }]);
    // In steady state too: a statement that arrives while another is in flight must wait for it.
    const [f, g] = await Promise.race([Promise.all([q(`select 6 as f`), q(`select 7 as g`)]), timeout]);
    assert.deepEqual([f[0], g[0]], [{ f: '6' }, { g: '7' }]);
    assert.deepEqual(pooler.dropped, [], 'the client wrote more than one statement per write');
  } finally {
    await Promise.race([sql.end({ timeout: 1 }), new Promise((r) => setTimeout(r, 1500))]);
    await pooler.close();
  }
});
