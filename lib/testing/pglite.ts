// lib/testing/pglite.ts: an in-process Postgres with our real schema + seed, and the same Q / appendEvent the app uses. Tests and simulation only.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { makeCaseStore } from '../casestore';
import type { EmittedEvent, TaskKind } from '../events';
import { appendEvent, type Q } from '../sink';

const file = (f: string) => readFileSync(new URL(`../../db/${f}`, import.meta.url), 'utf8');

/** `chain` (default ON) applies db/003_audit_chain.sql, so every test that emits also proves emit() works under the audit-chain trigger.
 *  PGlite is ONE connection: concurrent emits are serialized, so tests can cover the trigger's seq re-draw branch only deterministically
 *  (insert overriding system value), never a real cross-connection race. */
export async function testDb(opts: { chain?: boolean } = {}) {
  const db = new PGlite();
  await db.exec('create role anon nologin; create role authenticated nologin;');
  await db.exec(file('001_schema.sql')); await db.exec(file('002_seed.sql'));
  /** Applies a later migration by file name (e.g. '003_audit_chain.sql'), the way db:apply would. */
  const migrate = (f: string) => db.exec(file(f));
  if (opts.chain !== false) await migrate('003_audit_chain.sql');
  const q: Q = async (text, params = []) => (await db.query(text, params as never)).rows as never;
  // Same atomicity as production (`sql.begin` in lib/store.ts): each event + its state change is one transaction, so concurrent deliveries interleave only BETWEEN emits.
  const txq = (tx: { query: PGlite['query'] }): Q => async (text, params = []) => (await tx.query(text, params as never)).rows as never;
  const emit = (e: EmittedEvent, human?: string) => db.transaction((tx) => appendEvent(txq(tx as never), e, human));
  const events = async (caseId?: string) =>
    (await q<{ seq: number; type: string; payload: Record<string, unknown> }>(`select seq, type, payload from events ${caseId ? 'where case_id = $1' : ''} order by seq`, caseId ? [caseId] : []));
  const createTask = async (caseId: string, kind: TaskKind, title: string, reason: string) => {
    const [t] = await q<{ id: number }>(`insert into tasks (case_id, kind, title, reason) values ($1,$2,$3,$4) returning id`, [caseId, kind, title, reason]);
    await emit({ type: 'task.created', caseId, taskId: Number(t.id), kind, title, reason, assignee: 'AP lead' });
  };
  /** A case already in `held` for Acme with its claimed digits, as the pipeline leaves it before startCall. */
  const heldCase = async (vendorId = 'v_acme', claimedLast4: string | null = '4321') => {
    const [c] = await q<{ id: string }>(`insert into cases (source, vendor_id, claimed_last4) values ('email',$1,$2) returning id`, [vendorId, claimedLast4]);
    await q(`update cases set state = 'flagged' where id = $1`, [c.id]); await q(`update cases set state = 'held' where id = $1`, [c.id]);
    return c.id;
  };
  /** One transaction on the in-process database (the same shape production gets from postgres.js sql.begin). */
  const tx = <T,>(fn: (q: Q) => Promise<T>): Promise<T> => db.transaction((t) => fn(txq(t as never)));
  const stateOf = async (caseId: string) => (await q<{ state: string }>(`select state from cases where id = $1`, [caseId]))[0].state;
  return { db, q, migrate, emit, tx, events, createTask, heldCase, stateOf, store: makeCaseStore(q) };
}
