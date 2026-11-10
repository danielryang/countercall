// lib/audit.ts: the system checks its own log (Assurance items 3 + 4). Driver-agnostic (any Q: postgres.js in the app, PGlite in tests).
// 1. verifyChain: recomputes the hash chain installed by db/003_audit_chain.sql. The hash is computed IN SQL by the same events_canon()
//    the trigger uses, so the writer and the verifier cannot disagree about the canonical form.
// 2. replayCases: rebuilds every case's status from the log alone (pure nextState() over the stored events, plus the pure UI reducer over the
//    logged case.state rows) and compares it with cases.state. Never imports lib/store (tests and scripts pass their own Q).
import type { CaseState, EmittedEvent } from './events';
import { nextState } from './policy/lifecycle';
import { reduce } from './reducer';
import type { Envelope } from './runs';
import type { Q } from './sink';

export type ChainBreakKind = 'hash_mismatch' | 'link_mismatch' | 'unchained';
export interface ChainBreak { seq: number; kind: ChainBreakKind; expected: string | null; found: string | null }   // hex
export type ChainReport =
  | { installed: false }
  | { installed: true; intact: boolean; checked: number; preChain: number; preChainMaxSeq: number; breaks: number;
      firstBreak: ChainBreak | null; head: { seq: number; hash: string } | null };
export interface ReplayMismatch {
  caseId: string; db: CaseState; replayed: CaseState; projected: CaseState;
  reason: 'final_state' | 'transition_log' | 'unreadable_event'; atSeq: number | null;
}
export interface ReplayReport {
  cases: number; events: number; matched: number;
  outOfBand: { caseId: string; source: string; startedAt: CaseState }[]; mismatchCount: number; mismatches: ReplayMismatch[];   // first 50
}
export interface AuditReport { ok: boolean; checkedAt: string; ms: number; chain: ChainReport; replay: ReplayReport }

const MAX_MISMATCHES = 50;
/** postgres.js returns int8 as string, and json columns can arrive as a JSON string (prod rows double-encoded before commit 875784d). */
const json = <T>(v: unknown): T => (typeof v === 'string' ? JSON.parse(v) : v) as T;

export async function verifyChain(q: Q): Promise<ChainReport> {
  const [{ installed }] = await q<{ installed: boolean }>(`select to_regclass('public.events_chain_anchor') is not null as installed`);
  if (!installed) return { installed: false };   // before 003: never touch the missing columns
  // One statement = one snapshot. lag() over the post-anchor rows: the first chained row's expected prev is null (the last pre-chain row has no hash).
  const [r] = await q<{ pre_max: number | string; checked: number | string; pre_chain: number | string; breaks: number | string; first_break: unknown; head: unknown }>(`
    with a as (select pre_chain_max_seq p from events_chain_anchor),
    c as (select e.seq, e.hash, e.prev_hash, lag(e.hash) over (order by e.seq) want_prev,
                 sha256(coalesce(e.prev_hash, ''::bytea) || convert_to(events_canon(e), 'UTF8')) re
          from events e, a where e.seq > a.p),
    b as (select seq,
            case when hash is null then 'unchained'
                 when re <> hash then 'hash_mismatch'
                 when prev_hash is distinct from want_prev then 'link_mismatch' end kind,
            case when hash is null then null when re <> hash then encode(re, 'hex') else encode(want_prev, 'hex') end expected,
            case when hash is null then null when re <> hash then encode(hash, 'hex') else encode(prev_hash, 'hex') end found
          from c)
    select (select p from a)::float8 pre_max, (select count(*) from c)::int checked,
           (select count(*) from events e, a where e.seq <= a.p)::int pre_chain,
           (select count(*) from b where kind is not null)::int breaks,
           (select json_build_object('seq', seq, 'kind', kind, 'expected', expected, 'found', found) from b where kind is not null order by seq limit 1) first_break,
           (select json_build_object('seq', seq, 'hash', encode(hash, 'hex')) from c order by seq desc limit 1) head`);
  const fb = r.first_break == null ? null : json<{ seq: number | string; kind: ChainBreakKind; expected: string | null; found: string | null }>(r.first_break);
  const head = r.head == null ? null : json<{ seq: number | string; hash: string | null }>(r.head);
  const breaks = Number(r.breaks);
  return {
    installed: true, intact: breaks === 0, checked: Number(r.checked), preChain: Number(r.pre_chain), preChainMaxSeq: Number(r.pre_max), breaks,
    firstBreak: fb && { seq: Number(fb.seq), kind: fb.kind, expected: fb.expected, found: fb.found },
    head: head && { seq: Number(head.seq), hash: head.hash ?? '' },
  };
}

export interface ReplayCaseRow { id: string; state: CaseState; source: string }
export interface ReplayEventRow { seq: number | string; id: string; ts: string; case_id: string; type: string; actor: string; payload: unknown }

// Payloads nextState() never reads (it switches on type only, or the type is information-only) are sent as {} to keep the query small.
// Checked against lib/policy/lifecycle.ts: case.flagged / case.cleared read no payload; the rest return null unconditionally.
const SLIM_TYPES = ['email.received', 'email.classified', 'case.flagged', 'case.cleared', 'call.transcript.delta', 'call.tool', 'call.recording', 'call.requested', 'ramp.call'];

/** Loads cases + events in ONE statement (one snapshot, so a concurrent emit cannot cause a false mismatch). `slim: false` keeps every payload. */
export async function replayCases(q: Q, opts: { slim?: boolean } = {}): Promise<ReplayReport> {
  const slim = opts.slim !== false;
  const payload = slim
    ? `case when jsonb_typeof(payload) = 'object' and type in (${SLIM_TYPES.map((t) => `'${t}'`).join(', ')}) then '{}'::jsonb else payload end`
    : `payload`;
  const [r] = await q<{ cases: unknown; events: unknown }>(`
    select
     (select coalesce(json_agg(json_build_object('id', id, 'state', state, 'source', source) order by id), '[]'::json) from cases) cases,
     (select coalesce(json_agg(json_build_object('seq', seq, 'id', id, 'ts', to_char(ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'case_id', case_id, 'type', type, 'actor', actor, 'payload', ${payload}) order by seq), '[]'::json)
      from events where case_id is not null) events`);
  return replayLog(json<ReplayCaseRow[]>(r.cases), json<ReplayEventRow[]>(r.events));
}

type Transition = { from: CaseState; to: CaseState; cause: string; seq: number };
const decode = (p: unknown): Record<string, unknown> | null => {
  let v = p;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return null; } }   // legacy double-encoded rows
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
};

/** Pure: rebuild each case's state from its events and compare with the database row. Exported for tests. */
export function replayLog(cases: readonly ReplayCaseRow[], events: readonly ReplayEventRow[]): ReplayReport {
  const byCase = new Map<string, ReplayEventRow[]>();
  for (const e of [...events].sort((a, b) => Number(a.seq) - Number(b.seq))) {
    const list = byCase.get(e.case_id); if (list) list.push(e); else byCase.set(e.case_id, [e]);
  }
  const outOfBand: ReplayReport['outOfBand'] = [];
  const mismatches: ReplayMismatch[] = [];
  let mismatchCount = 0;

  for (const c of cases) {
    const evs = byCase.get(c.id) ?? [];
    let unreadableAt: number | null = null;
    const decoded: { e: ReplayEventRow; seq: number; p: Record<string, unknown> }[] = [];
    for (const e of evs) {
      const p = decode(e.payload);
      if (!p) { unreadableAt ??= Number(e.seq); continue; }
      decoded.push({ e, seq: Number(e.seq), p });
    }
    const stateRows = decoded.filter((d) => d.e.type === 'case.state');
    const logged: Transition[] = stateRows.map((d) => ({ from: d.p.from as CaseState, to: d.p.to as CaseState, cause: d.p.cause as string, seq: d.seq }));

    // demo_replay cases (scripts/replay-webhooks.ts) are moved to `held` by direct UPDATE before any event: start where their log starts.
    let start: CaseState = 'scanning';
    if (c.source === 'demo_replay') {
      start = logged[0]?.from ?? c.state;
      if (start !== 'scanning') outOfBand.push({ caseId: c.id, source: c.source, startedAt: start });
    }

    // nextState() reads only type, kind and decision.outcome, and toRow() changes none of them, so the stored row is enough.
    const derived: Transition[] = [];
    let cur = start;
    for (const d of decoded) {
      if (d.e.type === 'case.state') continue;
      let to: unknown;
      try { to = nextState({ ...d.p, type: d.e.type, caseId: c.id } as unknown as EmittedEvent, cur); }
      catch { unreadableAt ??= d.seq; break; }
      if (typeof to !== 'string') continue;   // null = information only; unknown types fall through nextState's default and return a non-string
      derived.push({ from: cur, to: to as CaseState, cause: d.e.type, seq: d.seq });
      cur = to as CaseState;
    }

    // The UI's view: the pure reducer over the logged case.state rows only (reduced per case, so a system.reset elsewhere cannot drop it).
    const envs: Envelope[] = stateRows.map((d) => ({ seq: d.seq, id: d.e.id, ts: d.e.ts, case_id: c.id, type: d.e.type, actor: d.e.actor, payload: d.p }));
    const projected: CaseState = reduce(envs).cases[c.id]?.state ?? start;

    let reason: ReplayMismatch['reason'] | null = null; let atSeq: number | null = null;
    if (unreadableAt !== null) { reason = 'unreadable_event'; atSeq = unreadableAt; }
    else {
      const n = Math.max(derived.length, logged.length);
      for (let i = 0; i < n; i++) {
        const a = derived[i], b = logged[i];
        if (!a || !b || a.from !== b.from || a.to !== b.to || a.cause !== b.cause) { reason = 'transition_log'; atSeq = b?.seq ?? a.seq; break; }
      }
      if (!reason && (cur !== c.state || projected !== c.state)) reason = 'final_state';
    }
    if (reason) {
      mismatchCount++;
      if (mismatches.length < MAX_MISMATCHES) mismatches.push({ caseId: c.id, db: c.state, replayed: cur, projected, reason, atSeq });
    }
  }
  return { cases: cases.length, events: events.length, matched: cases.length - mismatchCount, outOfBand, mismatchCount, mismatches };
}

/** Both checks. Sequential on purpose: PGlite is one connection, and the app's postgres.js pool is max:1 anyway. */
export async function verifyAudit(q: Q): Promise<AuditReport> {
  const t0 = performance.now();
  const chain = await verifyChain(q);
  const replay = await replayCases(q);
  return { ok: (chain.installed ? chain.intact : true) && replay.mismatchCount === 0, checkedAt: new Date().toISOString(), ms: Math.round(performance.now() - t0), chain, replay };
}
