# CounterCall: rules and context for Claude Code (binding)

CounterCall reads AP email, detects vendor bank-change requests, freezes the payments, phones the vendor on the number ALREADY ON FILE, and lets a human release the money. Hackathon build (BBS x Ramp "Automate the Old Way", technical track). Fictional customer Rice Robotics, fictional vendor Acme. No real third party is ever called; no real money moves.

**Deadlines:** Round 2 due **Tue 2026-11-10 23:59 PT** (repo + 3:30-4:30 demo video + live URL, via the Google Form in `docs/research/PLAN.md`). Live final **Thu 2026-11-19 evening** at Ramp SF. Rubric: 35% technical, 25% problem fit, 20% polish, 10% creativity, 10% presentation.

## Read order
1. This file. 2. `docs/research/PLAN.md` (decisions, schedule, **§13 amendments, which override 08**). 3. `docs/research/08-architecture.md` (build spec: §0-§3 decisions and data, §5 API, §6 security, **§7.5 task specs S1-S12**, **Appendix B = 19 tested files**). 4. Only the research file a task cites (01 voice, 02 email, 03 Ramp/Q&A, 04 design, 05 app UI, 06 video tools, 07 video script).

`docs/research/09-spikes.md` and `10-plan-review.md` are not in this repo (internal). Their fixes are already merged into PLAN §13. In research files, ignore `/home/user/...` paths and read `research/` as `docs/research/`.

## Current status (update this section as work lands)
- **Done:** S1a (scaffold, tokens, shadcn mapped to tokens), and the S2 code: env/auth/rate limit, Ramp client + DB mock + holds, DB-backed `Deps`, `ingest.ts` patches, `/api/{auth,health,events,demo/inject,demo/reset}`, seed/reset/setup scripts. `npm run verify` is green (46 tests incl. PGlite hold tests and ingest flow tests; eval 20/20 replay; 11 db groups).
- **First live result (`npm run eval:live`, claude-haiku-5-5, N=20 hand-built fixtures):** 20/20 correct, bank-change recall 12/12, false positives 0/4, LLM p50 1.8 s (max 3.4 s), $0.004 total. Quote it as N=20, not general accuracy.
- **Not run live yet:** anything needing `DATABASE_URL` (db:apply, the routes against Postgres, G0/G1), AgentMail webhook, Retell, Vercel. S9 (`lib/call.ts`, Retell routes wiring) and all UI (S3-S8) are not built. `startCall` is a seam that records a `verify_manually` task; S9 replaces it.
- Branch workflow: feature branch per task, conventional commits (`type: description`), **no Co-Authored-By / Claude attribution in commits or PRs**, fast-forward merge to `main` when `verify` is green, ask before force-push or rewriting pushed history.
- Proven offline by the research (not re-run here): ported 01+02 code type-checks and `npm run verify` passes from an empty directory (27 tests, eval 20/20 replay, 11 DB invariant groups on PGlite).
- Research assets that are NOT in this repo yet live next to it on this laptop: `../design/tools04/` (globals.css, slop-lint.js, halftone.py, contrast.py), `../design/app/snippets/` (reducer, spans, beat, level + tests, check-ui.sh), `../design/app/motion-proto.html`, `../spike-web/` (known-good Next 16 reference build), `../raw/` (Ramp OpenAPI + AgentMail docs). S1 copies the first two in; use the others as references only. Reference screenshots go in gitignored `refs/`.

### Bootstrap (S1a, one person, alone, before anyone branches)
1. Copy the fenced block under `### B.9` in `docs/research/08-architecture.md` to `scripts/port-research.mjs`.
2. `node scripts/port-research.mjs . docs/research` (writes package.json, tsconfig, db/, lib/, eval/, scripts/, fixtures generator, CLAUDE.md block, etc.). Then `node fixtures/make.mjs`.
3. `npm i`, then `npm i @fontsource-variable/mona-sans@5.3.0 @fontsource/ibm-plex-mono@5.3.0`, `npx playwright install chromium`. Lockfile must come from the public registry: `grep '"resolved"' package-lock.json | grep -vc registry.npmjs.org` prints 0.
4. Write `postcss.config.mjs` (`export default { plugins: { '@tailwindcss/postcss': {} } };`), `app/layout.tsx` (fonts per 04 §4.2), placeholder `app/page.tsx`. Copy `../design/tools04/globals.css` to `app/globals.css`, `tools04/{slop-lint.js,halftone.py,contrast.py}` to `tools/`, snippets `{reducer,spans,beat,level}.ts` + tests to `lib/`. **Do not use `create-next-app`** (it enables `cacheComponents`).
5. PLAN §13 amendments for S1: change every `tsx` script to `tsx --env-file-if-exists=.env.local ...`; add `"framework": "nextjs"` to `vercel.json`; `shadcn init -d --base radix -y` into `components/shadcn/`, `--radius: 0px` (never `0`), remove lucide; real `/api/health` doing `select now(), max(seq)`.
6. Run `npm run verify` after the LAST npm command, commit the lockfile, then **delete the `port` script from package.json and `scripts/port-research.mjs`** (re-running it overwrites edits). Never mention `npm run port` in the README.
7. Before the first code push: secret scan (08 §6) and `git grep` for non-public hostnames must print nothing.

## Environment (names only; values live in gitignored files, never in git or chat)
- Scripts read `.env.local`. This laptop currently has a root `.env` (gitignored). Either `cp .env .env.local` or keep both in sync. Never commit either. `.env.example` (B.10) is the committed template.
- **Set in `.env` now:** `ANTHROPIC_API_KEY`, `RETELL_API_KEY`, `AGENTMAIL_API_KEY`, `CALLEE_PHONE_E164` (maps to `ACME_PHONE_E164` + `ALLOWED_DEMO_NUMBERS`; consent from this person required), `RETELL_AREA_CODE`, `SUPABASE_ACCESS_TOKEN` (account-level management token: for the Supabase CLI/API only, NEVER put it in Vercel or app env).
- **Still missing before G0/G2:** `DATABASE_URL` (Supabase *Transaction pooler* URI, port 6543, not the access token), `PUBLIC_BASE_URL` (Vercel domain, or a `npx cloudflared tunnel --url http://localhost:3000` URL for local webhook work), `SESSION_SECRET` (`openssl rand -hex 32`), `DEMO_PASSCODE`, `RETELL_FROM_NUMBER` (buy a US number; a new number can return HTTP 409 for ~2 min), `RETELL_AGENT_ID` (printed by `npm run provision:agent`), `RETELL_VOICE_ID`, `AGENTMAIL_INBOX_ID` + `AGENTMAIL_WEBHOOK_SECRET` (printed by `npm run setup:agentmail`), `EXTRACT_MODEL=claude-haiku-5-5`, `ALLOWED_DEMO_NUMBERS`, `RAMP_MODE=mock`, `DEMO_ENABLED=1`, `PUBLIC_READ=1`.
- **New safety vars (PLAN §13 H4), default off in Production:** `CALLS_ENABLED=0` (`startCall` emits `task.created {reason:'calls disabled'}` unless `1`; turn on only for shoots and the final) and `INBOUND_ALLOWED_SENDERS` (comma list; other senders are recorded but cannot hold or call; the session-gated injector bypasses it). Add both to `.env.example`, `lib/env.ts`, and the README Safety section.
- Local Node is v24; research verified on 22.22. `engines` says `>=22`. If something odd breaks, try Node 22 first.

## Two-person split (roles are swappable; default: A = Daniel, B = Eric)
**Contract is fixed up front:** `lib/events.ts` (canonical events), `lib/sink.ts`, `db/001_schema.sql`. Nobody edits these without telling the other (`db/00N_*.sql` for later schema changes).

| | **A: backend + voice** | **B: UI + video + submission** |
|---|---|---|
| Before S1 done | Does **S1a** alone (port, install, verify, push). Then S1b: Supabase `db:apply`, Vercel deploy, `/api/health` | Prepare: read 04/05, Screen Studio or Cap setup, Drive folder, YouTube channel, open the Round-2 form and record every field |
| Next | **S2** pipeline (env.ts, store queries, deps.ts + patches P3-P5, ramp.ts + mock-db, auth, ratelimit, AgentMail webhook, `/api/events`, **`/api/demo/inject` + `/reset`**, seed scripts) | **S3** reducer on canonical events, 500 ms adaptive poll hook, `public/runs/fraud.json`, `/dev/states`, `export-run.ts`, `?replay=` in the `(app)` layout |
| Then | **S9** voice: `lib/call.ts`, Retell webhook/tool routes -> `emit`, `provision-agent.ts`, 6 signed replay fixtures, tunnel for webhook debugging. **Critical path to G2.** | **S4-S7** shell + queue, case detail, live call panel, decision bar + ReleaseDialog (parallel worktrees) |
| Then | Release/close/retry/resolve routes (S7 routes), `/api/demo/{replay,preflight}`, `eval:live`, plays Acme on the hero call | S8 demo panel UI, README (S12), script lock, VO, edit, Remotion (S11), export, upload, submit |

**File ownership (avoid merge fights):** A owns `lib/detect/ingest.ts` and `lib/detect/deps.ts` (including an empty `Deps.startCall` seam emitting `task.created {reason:'calls not wired'}`), `lib/call.ts`, `lib/voice/**`, `lib/store.ts`, `lib/ramp*.ts`, `app/api/**`, `scripts/**` except `shoot.mjs`/`export-run.ts`. B owns `components/**`, `app/(app)/**`, `app/page.tsx`, `app/globals.css`, `lib/reducer.ts`, `lib/use-events.ts`, `lib/motion.ts`, `video/**`, `README.md`, `public/**`.
One git worktree per agent (`git worktree add ../cc-<task> -b <task>`), small PRs, merge often. `main` auto-deploys: **never push a red `npm run verify`.** Opus for S3/S5/S6 and design review rounds; Sonnet for the rest. Max 2 concurrent agents per human.

## Gates (PST; compress to the real clock, order matters more than times)
G0 `verify` green + deployed + `/api/health` ok. G1 email (or inject) -> flagged case + frozen bills + `case.state` events on the deployed URL (**run `eval:live` once here**). G2 real call to a teammate: "No" -> BLOCKED; "Yes" + right digits -> awaiting approval; human release works (hard stop Tue 11:00). G3 Tue 10:30 Ramp mode frozen (mock unless sandbox fully works). G4 Tue 11:00 feature freeze. G5 Tue 13:00 UI freeze. G6 Tue 14:00 hero + variants shot, golden runs exported. G7 Tue 21:30 upload verified in incognito (YouTube Unlisted + Drive MP4). G8 Tue 22:00 form submitted, `git tag round2-submission` pushed.

**Scope decision: nothing is dropped. The full PLAN stays in scope** (landing page, S10, Ramp sandbox, Vapi staging, web-call mode, Remotion, video variants V2/V3). With one builder doing most of it, work in strict priority order and treat PLAN §6.6 cut lines as the order to sacrifice only if the clock forces it, never ahead of time: (1) S1, S2, S9 -> G2; (1b) assurance items 1 and 2; (2) S3-S8 UI with assurance items 3, 4, 5 between tasks; (3) hero shoot, VO, edit, README, submit; (4) S11 Remotion scenes, variants V2/V3; (5) S10; (6) landing page; (7) Ramp sandbox + `/api/ramp/webhook`. Do not start a lower tier while a higher tier's gate is red. Stage the Vapi fallback (Twilio upgrade + number, ~$20) as a human task early so the Tue 09:00 decision is real. **Never cut:** evidence sweep, freeze, call panel, stamp, hold-to-confirm release, demo preflight + reset, `?replay=`, the real-call hero take, VO/captions/loudness, policy tests, `eval:live` numbers before any number is shown.

## Assurance layer (added scope: the system proves its own safety)
Goal: make the system design technically impressive without adding features. Build in this order; each is backend-only and runs without live services (PGlite).
1. **Exhaustive policy verification** (~1 h): enumerate the full input space of `decideOutcome()` and `nextState()`; prove `CONFIRMED_LEGIT` needs all four conditions and `released` is reachable only via a human `payment.released`. Print "checked N cases, 0 unsafe". This N backs the "0 unsafe releases" claim (PLAN s9) and replaces the older N definition.
2. **Deterministic simulation testing** (~2 h, timebox): a seeded fuzzer replays the webhook pipeline (Retell + AgentMail) with duplicated, reordered, delayed and dropped events and bad signatures, then asserts invariants: one outcome per call, no release without a human, consistent log, held payments never un-held. A failing seed must reproduce exactly. Build after S9, since it hardens it.
3. **Hash-chained audit log** (~1.5 h): `db/003_*.sql` adds `prev_hash`/`hash` (trigger, advisory lock); `GET /api/audit/verify` recomputes the chain and reports the first break; UI shows a "chain intact" badge. Additive migration only.
4. **Event-sourcing replay check** (~1 h): replay the whole log through the pure reducer + `nextState()` and assert it reproduces every `cases.state`. Exposed by the same `/api/audit/verify`.
5. **Latency waterfall** (~1 h, UI): email -> flagged -> held -> call, from `llmMs`, `ramp.call.ms` and event timestamps.
Deferred on purpose (Nov 19 material): outbox/reconciler (Hobby crons run once a day) and Ramp-side bank-change diff (only meaningful with sandbox access).

## Commands
- `npm run verify` is the gate: typecheck, unit tests, eval (replay), eval unit + smoke, db:check. Run before saying "done".
- `npm run dev`, `build`, `lint:ui` (static token lint; must exit 0), `lint:slop` (needs dev server), `shoot` (Playwright PNGs; read them).
- `npm run eval:live` needs `ANTHROPIC_API_KEY`, ~$0.05. Run before any accuracy number appears in the video or README.
- `npm run replay:webhooks -- <fixture|all>` replays signed webhooks at `BASE_URL`. `db:apply`, `db:check`, `demo:reset`, `seed:phones`, `seed:history`, `setup:agentmail`, `provision:agent`, `preflight`.

## Backend invariants (never trade these for speed)
1. Fail closed. Any unclear state keeps payments held and creates a human task.
2. The LLM never releases money, never chooses a phone number, never sets a state. It reports; code decides. `decideOutcome()` (`lib/voice/decide.ts`) and `nextState()` (`lib/policy/lifecycle.ts`) are the only deciders. `canRelease()` plus the human release route are the only path to `payment.released`.
3. One writer: every event goes through `emit()` in `lib/store.ts`. Never `insert into events` elsewhere. `events` is append-only (DB triggers). Corrections are new rows.
4. The only number ever dialed is the primary `trusted_contacts` row for that vendor, and it must be in `ALLOWED_DEMO_NUMBERS`. Never read a phone number from an email, prompt, tool argument or request body.
5. Secrets stay server-side. Expected challenge digits live only in `cases.challenge_expected` and are read only by `CaseStore.getExpectedLast4`. Never in events, prompts, dynamic variables, metadata, logs or API responses. No `NEXT_PUBLIC_` vars unless listed in `.env.example`.
6. Every webhook verifies its signature on the RAW body first (`await req.text()`, never `req.json()` first), is idempotent, returns fast, and does work in `after()`. Bad signature: 401 (Retell, Ramp), 400 (Svix: AgentMail, Resend). Mutating human routes need the passcode session + same-origin `Origin` + `content-type: application/json`.
7. `request_summary` is built by `requestSummary()` in code, never from email text.
8. Never log full phone numbers, full bank numbers, API keys or challenge digits. `toRow()` redaction is the choke point.
9. The UI derives everything from events via the pure `lib/reducer.ts`. Status comes only from `case.state` events. Money is never optimistic.
10. Ramp: `makeRamp()` picks mock (default, DB-backed) or sandbox. Hold at bill and vendor level; HTTP 202 means pending. The UI chip must say RAMP MOCK / RAMP SANDBOX truthfully; never claim "live in Ramp" in mock mode.
11. No SDK client and no `env()` call at module scope (`new Retell()`, `new Resend()`, `new Anthropic()`): `next build` imports every route module. Use a lazy getter.
12. Next 16 is not the Next you know: read the relevant page under `node_modules/next/dist/docs/` before route/config/caching code. Never enable `cacheComponents`; no `export const runtime`/`preferredRegion` in routes (`maxDuration` and `after()` are fine).
13. Post-call policy is `decideOutcome()` only. `postCallDecision()` in `lib/detect/policy.ts` exists for `eval/run.ts`; never import it from `app/` or `lib/`.
14. Public inbox + public repo: anyone can email the AP address. Calls stay behind `CALLS_ENABLED` and `INBOUND_ALLOWED_SENDERS`. `/api/demo/*`, `/demo`, `/dev/states` need the session and `DEMO_ENABLED=1` (else 404; `/dev/states` needs only `DEMO_ENABLED`).

## UI rules (`npm run lint:ui` must exit 0)
- Look: "Safety paper and signal", Greptile-like grammar. 0 radius, no shadows, no gradients except `--hatch`. 1px dashed hairline frames with `+` registration ticks. Mono UPPERCASE micro labels. The call card is the only dark surface.
- Tokens only, from `app/globals.css` (its `@theme` wipes Tailwind defaults: `rounded-*`, `shadow-*`, `bg-indigo-*`, `white`, `black` do not exist). No hex in components. Never add a font, dependency, radius, shadow or gradient to fix a layout; fix layout, scale or copy, or delete.
- Palette: paper `#E9E6DE`, ink `#14161D`, cobalt `#1B4DFF`. Fonts: Mona Sans (display/body), IBM Plex Mono (labels/data; stamp at 600). `data-app` on the app layout (label tracking 0.08em). `evidence-strong` is a cobalt tint, not pink (pink = NEEDS_REVIEW).
- Status chips: glyph + text + shape, never color alone. Risk: HELD, CALLING, VERIFIED, BLOCKED, NEEDS_REVIEW. Neutral: SCANNING, CLEAR, FLAGGED, RELEASED, CLOSED. Mapping in 08 §3.4.
- Stage 1280x720, no scroll per story beat. Body 15px, mono micro 11px (13px under `data-scale="video"`). Record at 1280x720 CSS px, DPR 2.
- Motion: only `lib/motion.ts` tokens, `import ... from 'motion/react'`, 8px max travel, no springs, a `prefers-reduced-motion` branch for each, with a comment naming the state change it communicates.
- `components/**` (except `components/shadcn/`) are pure presentational: no `next/*`, no data hooks, no server code, so the Remotion project in `video/` can import them.
- Icons: hand-written 12px SVG, butt caps, miter joins. No lucide, no emoji. Phones masked. Release is human-only, hold-to-confirm (800 ms), never optimistic. Render email text as text, never HTML.
- After every UI change: `npm run lint:ui`, `npm run shoot`, open the PNGs, fix what you see. Taste loop: max 3 rounds; stop at lint 0, blockers R1-R5 pass, total >= 14/16 (04 §6.4). Amounts shown come from the DB: two Acme bills of $12,400 = **$24,800** (ignore $48,200 / $60,950 in older docs).

## Truthfulness rules for the demo and README
Real: email pipeline, LLM detection, the phone call to team-owned numbers, outcome policy, audit log. Seeded: vendors, W-9 provenance, past cases, company, approver. Fake and labeled: Ramp (mock), SPF/DKIM of injected fixtures, settlement. Label SIMULATED (injector), REPLAY (recorded runs), RAMP MOCK. Say "Real call · no cuts · audio lightly cleaned", never "unedited". Use the corrected stats from 03 §3.1 (AFP 2026: 74% hit by BEC; 30% recovered most, 20% got nothing; FBI IC3 2025 $3.05B BEC), not the old "22%" line. Concede prior art (nsKnox, Trouvé, CallbackProof). Claim "0 unsafe releases across N" only with N defined (6 replay scenarios + 20 decide tests + 7 lifecycle tests) and printed by a script. Agent must disclose it is automated and may be recorded in its first sentence; only consenting teammates are ever called.

## Layout
`app/` routes + API, `components/` pure UI (`shadcn/` generated), `lib/` logic (`detect/` email, `voice/` call, `policy/` state machine, `ramp.ts`, `store.ts`, `events.ts`, `sink.ts`, `reducer.ts`), `db/` SQL, `fixtures/` emails + Retell replay fixtures, `public/runs/` recorded golden runs (the only runs folder), `eval/`, `scripts/`, `tools/`, `video/` (own package.json; excluded from root tsconfig; pin Remotion 4.0.539, `typescript ~5.9`, `@source` lines in `video/src/index.css`), `docs/research/`, `refs/` (gitignored).

## Do not
- Do not add a dependency without saying why in the PR description.
- Do not make the app call a real vendor, bank, or Ramp production.
- Do not weaken a test or check to make it pass; fix the code.
- Do not change `db/001_schema.sql` after M1; add `db/00N_*.sql` and announce it.
- Do not commit `.env*`, `refs/`, phone numbers, keys, or the `SUPABASE_ACCESS_TOKEN`. Phones reach the DB only via `seed:phones` from env.
- Do not push to `main` with a red `npm run verify`; do not force-push.
