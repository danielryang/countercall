// lib/store.ts: the one database client, the one `emit()`, and 01's CaseStore on our schema. Everything that writes events imports from here.
import postgres from 'postgres';
import { makeCaseStore } from './casestore';
import { appendEvent, type Q } from './sink';
import type { EmittedEvent } from './events';
import { registerSink } from './voice/events';
import type { CaseStore } from './voice/finalize';

// Supabase transaction pooler: no prepared statements, one connection per serverless instance.
const pg = postgres(process.env.DATABASE_URL ?? '', { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });

// One statement (or one whole transaction) in flight per instance: every entry point below goes through `serial`.
// postgres.js pipelines (writes the next statement before the previous ReadyForQuery) while a parameterless statement is in flight and when
// it flushes what queued up during connect. The transaction pooler (:6543) answers only the first statement of such a write, and postgres.js
// hands responses out strictly in order, so each later statement gets the next one's rows and the last waits for the next write
// ("v.domains is not iterable", "events is not iterable", 5-40 s requests; lib/store.pipeline.test.ts). Not `max_pipeline: 0`: it also
// skips the hook `begin` uses to reserve the connection (TypeError, process crash).
let tail: Promise<unknown> = Promise.resolve();
const serial = <T>(run: () => PromiseLike<T>): Promise<T> => {
  const p = tail.then(run);
  tail = p.then(() => undefined, () => undefined);
  return p;
};

type Rows = postgres.RowList<postgres.Row[]>;
/** Tagged templates, `unsafe` and `end` (all that app code and scripts use), each statement through the gate. */
export const sql = Object.assign(
  (strings: TemplateStringsArray, ...args: unknown[]): Promise<Rows> => serial(() => pg(strings, ...(args as never[]))),
  { unsafe: (text: string, params: unknown[] = []): Promise<Rows> => serial(() => pg.unsafe(text, params as never)), end: pg.end },
);

/** The only way an event enters the system. One transaction: event row, optional state change, optional `case.state` row. */
export const emit = (e: EmittedEvent, human?: string) =>
  serial(() => pg.begin((tx) => appendEvent((text, params = []) => tx.unsafe(text, params as never) as never, e, human)));

// 01's producers (webhook routes, finalizeCall) call their own `emit`; route it into the same writer, once, at module load.
registerSink(async (e) => { await emit(e); });

/** Driver-agnostic query function over postgres.js (autocommit). Transactions go through `emit` / `tx`. */
export const q: Q = (text, params = []) => sql.unsafe(text, params) as never;

/** One transaction on the production driver (postgres.js types wrap the result in a way that does not match a generic callback, hence the cast). */
export const tx = <T>(fn: (q: Q) => Promise<T>): Promise<T> =>
  serial(() => pg.begin((t) => fn((text, params = []) => t.unsafe(text, params as never) as never))) as Promise<T>;

/** 01's CaseStore on our schema (lib/casestore.ts). */
export const store: CaseStore = makeCaseStore(q);
