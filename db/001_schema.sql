-- db/001_schema.sql  (Postgres 15+, runs unchanged in the Supabase SQL editor and in PGlite)
-- Stance: RLS ON for every table, ZERO policies. The browser never talks to the DB; only our server routes
-- (service/DB-URL role, which bypasses RLS) read or write. See 08-architecture.md section 6.

-- ---------- enums ----------
create type case_state as enum (
  'scanning','cleared','flagged','held','calling','awaiting_approval','fraud_blocked','needs_human','released','closed');
create type contact_source as enum (
  'onboarding_w9','contract','ramp_contact_at_import','vendor_website','prior_verified_call','human_entered');
create type contact_status as enum ('trusted','quarantined','revoked');
create type account_status as enum ('active','pending_approval','pending_deletion','rejected');
create type hold_state     as enum ('requested','applied','pending_ramp_approval','released','failed');
create type challenge_kind as enum ('last_paid_invoice_last4','new_account_last4');
create type call_mode      as enum ('phone','web','replay');

-- ---------- reference data (seeded; mutable only by seed/demo reset) ----------
create table org (
  id            boolean primary key default true check (id),               -- exactly one row
  name          text not null,
  domain        text not null,
  ap_inbox      text,
  exec_names    text[] not null default '{}',                              -- names scammers impersonate (02 OrgConfig)
  approver_name text not null default 'A. Patel, AP Lead'
);

create table vendors (
  id                    text primary key,                                  -- 'v_acme': same ids as fixtures/vendors.json
  name                  text not null unique,                              -- detector matching key, e.g. 'Acme Corp'
  legal_name            text,
  domains               text[] not null check (cardinality(domains) > 0),
  known_contacts        text[] not null default '{}',                      -- lowercased email addresses seen before
  country               char(2) not null default 'US',
  ramp_vendor_id        uuid unique,                                       -- set when RAMP_MODE=sandbox
  typical_invoice_cents bigint not null check (typical_invoice_cents > 0)
);

-- OUR table: Ramp keeps only a current phone with no history. The number we dial lives here, with provenance.
create table trusted_contacts (
  id               uuid primary key default gen_random_uuid(),
  vendor_id        text not null references vendors(id),
  phone_e164       text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  label            text not null,
  source           contact_source not null,
  source_doc       text,
  added_by         text not null,
  first_seen_at    timestamptz not null,
  last_verified_at timestamptz,
  last_verified_by text,                                                   -- 'call:<id>' | 'human:<name>'
  status           contact_status not null default 'trusted',
  quarantine_reason text,
  is_primary       boolean not null default false,
  ramp_contact_id  uuid,
  check (status <> 'quarantined' or quarantine_reason is not null),
  check (not is_primary or status = 'trusted')
);
create unique index trusted_contacts_one_primary on trusted_contacts (vendor_id) where is_primary;

create table bank_accounts (            -- mirrors Ramp's ApiVendorBankAccountResource; never store full account numbers
  id               uuid primary key default gen_random_uuid(),
  vendor_id        text not null references vendors(id),
  ramp_account_id  uuid,
  bank_name        text not null,
  routing_number   char(9) check (routing_number ~ '^[0-9]{9}$'),          -- public ABA identifier, needed for the differs-from-file signal
  account_last4    char(4) not null check (account_last4 ~ '^[0-9]{4}$'),
  status           account_status not null default 'active',
  is_default       boolean not null default true,
  first_seen_at    timestamptz not null,
  verified_at      timestamptz,
  verified_by      text
);
create unique index bank_accounts_one_active_default on bank_accounts (vendor_id) where is_default and status = 'active';

create table bills (                    -- mirrors a Ramp Bill subset; in RAMP_MODE=mock this table IS the mock Ramp's database
  id                 text primary key,                                     -- 'pay_8101' (our payment id; events call it paymentId)
  vendor_id          text not null references vendors(id),
  ramp_bill_id       uuid unique,
  invoice_number     text not null,
  amount_cents       bigint not null check (amount_cents > 0),
  currency           char(3) not null default 'USD',
  payment_method     text not null default 'ACH',
  due_date           date not null,
  paid_at            timestamptz,                                          -- non-null = history (source of the last-paid-invoice challenge)
  ramp_status_summary text not null default 'PAYMENT_SCHEDULED',           -- mirror of Ramp Bill.status_summary
  unique (vendor_id, invoice_number)
);

-- ---------- case lifecycle ----------
create sequence case_seq start 100;                              -- seeded history takes CC-0100..; live demo cases follow
-- lpad() TRUNCATES when the number is longer than the pad width (case 10000 would become 'CC-1000' and collide with an existing id).
-- Found by the simulator at ~9,900 cases. Pad only below 10000. A DEFAULT cannot hold a subquery, hence the function.
create function next_case_id() returns text language sql as $$
  select 'CC-' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end from (select nextval('case_seq')::bigint as n) s
$$;

create table cases (
  id                       text primary key default next_case_id(),
  source                   text not null check (source in ('email','ramp_webhook','demo_replay','seed')),
  state                    case_state not null default 'scanning',
  vendor_id                text references vendors(id),
  email_provider_event_id  text unique,
  email_message_id         text,
  category                 text,
  risk                     text,
  bank_key                 text,                                           -- sha256 prefix of the claimed routing|last4|iban (02 claimCallback)
  claimed_last4            char(4) check (claimed_last4 ~ '^[0-9]{4}$'),   -- SERVER-ONLY (see challenge facts, section 2.5)
  claimed_invoices         text[] not null default '{}',
  challenge_kind           challenge_kind not null default 'last_paid_invoice_last4',
  challenge_expected       char(4) check (challenge_expected ~ '^[0-9]{4}$'), -- SERVER-ONLY SECRET: never in events, prompts, metadata, logs or API responses
  call_attempts            int not null default 0 check (call_attempts between 0 and 3),
  released_by              text,
  release_note             text,
  released_at              timestamptz,
  archived_at              timestamptz,                                    -- demo reset archives; nothing is deleted
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (state <> 'released' or (released_by is not null and released_at is not null))   -- no path to 'released' without a named human
);
-- one open case per vendor per distinct claimed bank change (anti call-spam, 02 section 5)
create unique index cases_one_open_per_bank on cases (vendor_id, bank_key)
  where archived_at is null and vendor_id is not null and bank_key is not null
    and state in ('flagged','held','calling','needs_human','awaiting_approval','fraud_blocked');

create table case_transitions (from_state case_state not null, to_state case_state not null, primary key (from_state, to_state));
insert into case_transitions values
  ('scanning','cleared'),('scanning','flagged'),('scanning','needs_human'),
  ('flagged','held'),('flagged','needs_human'),
  ('held','calling'),('held','needs_human'),('held','closed'),
  ('calling','awaiting_approval'),('calling','fraud_blocked'),('calling','needs_human'),
  ('needs_human','calling'),('needs_human','released'),('needs_human','closed'),
  ('awaiting_approval','released'),('awaiting_approval','closed'),
  ('fraud_blocked','released'),('fraud_blocked','closed');

create function cases_guard() returns trigger language plpgsql as $$
begin
  if new.state is distinct from old.state
     and not exists (select 1 from case_transitions t where t.from_state = old.state and t.to_state = new.state) then
    raise exception 'illegal case transition % -> %', old.state, new.state;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger cases_guard_trg before update on cases for each row execute function cases_guard();

-- ---------- calls (reserve a row, THEN dial) ----------
create table calls (
  id                  uuid primary key default gen_random_uuid(),
  retell_call_id      text unique,                                         -- null until createPhoneCall returns; 'replay_<ts>' for replay
  case_id             text not null references cases(id),
  vendor_id           text not null references vendors(id),
  contact_id          uuid not null references trusted_contacts(id),
  attempt             int not null check (attempt between 1 and 3),
  mode                call_mode not null default 'phone',
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  disconnection_reason text,
  outcome             text check (outcome in ('CONFIRMED_LEGIT','DENIED_FRAUD','UNVERIFIED')),
  reason              text,
  decision            jsonb,                                               -- full decideOutcome() result
  unique (case_id, attempt)                                                -- a webhook retry cannot dial twice
);
-- DB backstop for the trust anchor: only a trusted contact of THIS vendor, on file >= 30 days, can be dialed.
create function calls_trust_guard() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from trusted_contacts c
                 where c.id = new.contact_id and c.vendor_id = new.vendor_id
                   and c.status = 'trusted' and c.first_seen_at <= now() - interval '30 days') then
    raise exception 'contact % is not a trusted, seasoned number for vendor %', new.contact_id, new.vendor_id;
  end if;
  return new;
end $$;
create trigger calls_trust_guard_trg before insert on calls for each row execute function calls_trust_guard();

create table call_tool_calls (          -- what the LLM REPORTED (01 CaseStore.addToolCall); upsert on (call, key)
  retell_call_id text not null,
  key            text not null,
  name           text not null check (name in ('report_answer','report_challenge','report_flag')),
  args           jsonb not null,
  created_at     timestamptz not null default now(),
  primary key (retell_call_id, key)
);

-- ---------- Ramp holds, tasks ----------
create table holds (                    -- OUR record of what we asked Ramp to do; persisted BEFORE the Ramp call (03 section 7.1)
  id           uuid primary key default gen_random_uuid(),
  case_id      text not null references cases(id),
  scope        text not null check (scope in ('vendor','bill')),
  vendor_id    text not null references vendors(id),
  bill_id      text references bills(id),
  state        hold_state not null default 'requested',
  http_status  int,
  reason       text,
  requested_at timestamptz not null default now(),
  applied_at   timestamptz,
  released_at  timestamptz,
  released_by  text,
  check ((scope = 'bill') = (bill_id is not null)),
  unique nulls not distinct (case_id, scope, bill_id)                      -- idempotent hold per case
);

create table tasks (
  id          bigint generated always as identity primary key,
  case_id     text not null references cases(id),
  kind        text not null check (kind in ('verify_manually','retry_call','review','security_escalation','hold_failed')),
  title       text not null,
  reason      text not null,
  assignee    text not null default 'AP lead',
  status      text not null default 'open' check (status in ('open','resolved')),
  resolution  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------- append-only audit log + realtime feed ----------
create table events (
  seq      bigint generated always as identity primary key,                -- global, monotonic: poll cursor + dedupe
  id       uuid not null default gen_random_uuid() unique,
  idem_key text unique,                                                    -- webhook/consumer idempotency ('call_x:outcome')
  ts       timestamptz not null default now(),
  case_id  text,                                                           -- NO FK: the log outlives cases (reset archives, never deletes)
  type     text not null check (type ~ '^[a-z]+(\.[a-z_]+)+$'),
  actor    text not null check (actor in ('system','detector','policy','voice_agent') or actor like 'human:%'),
  payload  jsonb not null default '{}'::jsonb
);
create index events_case_seq on events (case_id, seq);
create index events_type_seq on events (type, seq);

create function events_append_only() returns trigger language plpgsql as $$
begin raise exception 'events is append-only (% blocked); corrections are new rows', tg_op; end $$;
create trigger events_no_update_delete before update or delete on events for each row execute function events_append_only();
create trigger events_no_truncate     before truncate          on events for each statement execute function events_append_only();

-- ---------- webhook inbox + rate limits ----------
create table raw_webhooks (             -- every verified (or rejected) webhook body: debugging, replay, golden-call capture
  provider     text not null,         -- 'agentmail' | 'resend' | 'retell' | 'ramp'
  event_key    text not null,         -- provider event id (dedupe key)
  received_at  timestamptz not null default now(),
  signature_ok boolean not null,
  payload      jsonb not null,
  primary key (provider, event_key)
);

create table rate_limits (bucket text not null, window_start timestamptz not null, n int not null default 0, primary key (bucket, window_start));
-- fixed-window counter: select rate_limit_hit('auth:1.2.3.4', 600) > 5 => block
create function rate_limit_hit(p_bucket text, p_window_s int) returns int language sql as $$
  insert into rate_limits (bucket, window_start, n)
  values (p_bucket, to_timestamp(floor(extract(epoch from now()) / p_window_s) * p_window_s), 1)
  on conflict (bucket, window_start) do update set n = rate_limits.n + 1
  returning n;
$$;

-- ---------- RLS: on everywhere, no policies; belt and braces revoke when Supabase roles exist ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'revoke all on all sequences in schema public from anon, authenticated';
    execute 'revoke all on all functions in schema public from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on tables from anon, authenticated';
  end if;
end $$;
