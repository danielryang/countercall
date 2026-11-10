// lib/store.ts: the one database client, the one `emit()`, and 01's CaseStore on our schema. Everything that writes events imports from here.
import postgres from 'postgres';
import { makeCaseStore } from './casestore';
import { appendEvent, type Q } from './sink';
import type { EmittedEvent } from './events';
import { registerSink } from './voice/events';
import type { CaseStore } from './voice/finalize';

// Supabase transaction pooler: no prepared statements, one connection per serverless instance.
export const sql = postgres(process.env.DATABASE_URL ?? '', { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });

/** The only way an event enters the system. One transaction: event row, optional state change, optional `case.state` row. */
export const emit = (e: EmittedEvent, human?: string) =>
  sql.begin((tx) => appendEvent((text, params = []) => tx.unsafe(text, params as never) as never, e, human));

// 01's producers (webhook routes, finalizeCall) call their own `emit`; route it into the same writer, once, at module load.
registerSink(async (e) => { await emit(e); });

/** Driver-agnostic query function over postgres.js (autocommit). Transactions go through `emit` / `sql.begin`. */
export const q: Q = (text, params = []) => sql.unsafe(text, params as never) as never;

/** One transaction on the production driver (postgres.js types wrap the result in a way that does not match a generic callback, hence the cast). */
export const tx = <T>(fn: (q: Q) => Promise<T>): Promise<T> => sql.begin((t) => fn((text, params = []) => t.unsafe(text, params as never) as never)) as Promise<T>;

/** 01's CaseStore on our schema (lib/casestore.ts). */
export const store: CaseStore = makeCaseStore(q);
