-- db/003_audit_chain.sql (additive, idempotent; safe on a live DB that already has rows in events). Apply: npm run db:apply 003
-- Hash-chains every NEW event: hash = sha256(prev_hash || canonical row). Rows written before this migration are "pre-chain"
-- (counted by GET /api/audit/verify, never backfilled: events is append-only).
-- Changing events_canon() invalidates every stored hash: add a new function + anchor instead of editing it.
-- The explicit begin/commit is deliberate: scripts/db-apply.ts sends the file as ONE simple-protocol query (postgres.js sql.unsafe, no params)
-- and PGlite exec() does the same, so the lock below is held until commit in both.
begin;
lock table events in exclusive mode;

alter table events add column if not exists prev_hash bytea, add column if not exists hash bytea;

-- Where the chain starts. Write-once: moving it would let someone hide edits by calling them "pre-chain".
create table if not exists events_chain_anchor (
  id                boolean primary key default true check (id),
  pre_chain_max_seq bigint not null,
  installed_at      timestamptz not null default now()
);
insert into events_chain_anchor (pre_chain_max_seq) select coalesce(max(seq), 0) from events on conflict (id) do nothing;

create or replace function events_chain_anchor_frozen() returns trigger language plpgsql as $$
begin raise exception 'events_chain_anchor is write-once (% blocked)', tg_op; end $$;
drop trigger if exists events_chain_anchor_frozen_trg on events_chain_anchor;
create trigger events_chain_anchor_frozen_trg before update or delete on events_chain_anchor for each row execute function events_chain_anchor_frozen();
drop trigger if exists events_chain_anchor_no_truncate on events_chain_anchor;
create trigger events_chain_anchor_no_truncate before truncate on events_chain_anchor for each statement execute function events_chain_anchor_frozen();

-- The canonical text of a row. The trigger and the verifier (lib/audit.ts) both call THIS function, so they cannot drift apart.
-- ts is rendered in UTC with microseconds, so the session timezone never changes a hash.
create or replace function events_canon(e events) returns text language sql stable set search_path = pg_catalog, public as $$
  select jsonb_build_array(e.seq, e.id, e.idem_key, to_char(e.ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                           e.case_id, e.type, e.actor, e.payload)::text
$$;

create or replace function events_chain() returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare last_seq bigint; last_hash bytea;
begin
  -- Under REPEATABLE READ / SERIALIZABLE the "last row" below would come from a stale snapshot and fork the chain.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'events must be appended under READ COMMITTED (audit chain)';
  end if;
  -- Lock order: case row THEN chain lock (lib/release.ts locks the case row before appending; lib/sink.ts appends then locks the same row,
  -- which is a no-op re-lock here). Rule: one transaction appends events for at most one case.
  if new.case_id is not null then perform 1 from cases where id = new.case_id for update; end if;
  perform pg_advisory_xact_lock(1128464387);
  select seq, hash into last_seq, last_hash from events order by seq desc limit 1;
  -- seq was drawn BEFORE the lock; re-draw so seq order = commit order = chain order (also fixes the ?after= cursor race).
  if last_seq is not null and new.seq <= last_seq then
    new.seq := nextval(pg_get_serial_sequence('public.events', 'seq'));
  end if;
  new.prev_hash := last_hash;
  new.hash := sha256(coalesce(last_hash, ''::bytea) || convert_to(events_canon(new), 'UTF8'));
  return new;
end $$;
drop trigger if exists events_chain_trg on events;
create trigger events_chain_trg before insert on events for each row execute function events_chain();

alter table events_chain_anchor enable row level security;
revoke all on function events_canon(events), events_chain(), events_chain_anchor_frozen() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on events_chain_anchor from anon, authenticated';
    execute 'revoke all on function events_canon(events), events_chain(), events_chain_anchor_frozen() from anon, authenticated';
  end if;
end $$;
commit;
