// lib/testing/pglite.ts: an in-process Postgres with our real schema + seed, and the same Q / appendEvent the app uses. Tests and simulation only.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { makeCaseStore } from '../casestore';
import type { EmittedEvent, TaskKind } from '../events';
import { appendEvent, type Q } from '../sink';

const file = (f: string) => readFileSync(new URL(`../../db/${f}`, import.meta.url), 'utf8');

export async function testDb() {
  const db = new PGlite();
  await db.exec('create role anon nologin; create role authenticated nologin;');
  await db.exec(file('001_schema.sql')); await db.exec(file('002_seed.sql'));
  const q: Q = async (text, params = []) => (await db.query(text, params as never)).rows as never;
  const emit = (e: EmittedEvent, human?: string) => appendEvent(q, e, human);
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
  const stateOf = async (caseId: string) => (await q<{ state: string }>(`select state from cases where id = $1`, [caseId]))[0].state;
  return { db, q, emit, events, createTask, heldCase, stateOf, store: makeCaseStore(q) };
}
