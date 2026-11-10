# CounterCall: Round 2 shooting script

Status: **ready to lock**. Lock it after the hero take, once the numbers below are re-checked (see "Numbers and their sources").
Target runtime **4:12** (rules: 3:30 to 4:30). Fallback cut without a new hero take: **3:50**.
Sources: PLAN §8, `docs/research/07-video-creative.md` §0, §3, §6, `docs/research/06-video-pipeline.md` §4 to §6, `docs/research/08-architecture.md` §8.5 and §8.6, README.

`THEME` = the app theme for every screen recording and for the Remotion scenes. The team has not picked one: `graphite`, `paper` or `cloud`. Set it once here and in `video/src/timeline.ts` (`THEME`), then add `?theme=THEME` to every URL below.

Voices: **DANIEL** and **ERIC** (team voices, never AI). **ACME** is played by a consenting teammate on the phone, from an improv card, not a script.

## Rules that apply to every frame (binding, from CLAUDE.md)

- Labels on screen: **SIMULATED** (email sent from the `/demo` injector), **REPLAY** (anything played from `public/runs/`), **RAMP MOCK** (every hold and release). The app already shows these chips; never crop them out.
- The hero label is **"Real call · no cuts · audio lightly cleaned"**, and only on a real take with its real audio. Never write or say "unedited".
- Stats: only AFP 2026 (74% hit by BEC; 30% recovered most, 20% nothing) and FBI IC3 2025 ($3.05B BEC losses). No "22%" line, no callback-skip statistic.
- "0 unsafe releases" only next to its N (20,995,238 cases, `npm run verify:policy`), as the Assurance scene shows it.
- Eval numbers are N=20 hand-built emails, "not a general accuracy claim", with date and model.
- Ramp is a mock: say "built against Ramp's Developer API", never "live in Ramp".
- Prior art is conceded in the README (nsKnox, Trouvé, CallbackProof). If asked on camera or in the description, concede it; do not claim "first".
- No AI video, avatars or AI voice. Remotion is used only for type and diagrams.

## Beat table

Times are in the final cut. **SR** screen recording, **RM** Remotion scene (`video/`), **LA** live-action phone footage. Remotion scene lengths come from `video/src/timeline.ts` `MARKS`, which match the rows marked with a scene name.

| # | Time | Len | On screen | VO | Label on screen | Numbers and where they come from |
|---|---|---|---|---|---|---|
| A1 | 0:00-0:10 | 10 s | RM `Problem`: the fictional Acme bank-change email, two phrases highlighted, the $24,800 payment bar | ERIC: "Your vendor emails: 'We have changed banks. Please send this month's payment to our new account.' Same name, same invoice. Pay it, and the money goes to whoever sent it." | `Fictional vendor · fictional email` (scene header) | $24,800.00 = two seeded Acme bills of $12,400 (`db/002_seed.sql`; the app shows it from the `payment.held` event) |
| A2 | 0:10-0:23 | 13 s | RM `Stats`: three sourced counters | DANIEL: "Business email compromise hit about three in four organizations in 2025. Of the companies hit by payments fraud, only three in ten got most of it back. One in five got nothing. Losses reported to the FBI: over three billion dollars." | Source line under each card | 74%, 30%, 20%: AFP 2026 Payments Fraud and Control Survey. $3.05B: FBI IC3 2025 Annual Report. Both cited in README §10 |
| A3 | 0:23-0:31 | 8 s | SR landing `/` hero ("Call the number you already have."), slow scroll to the call section | DANIEL: "The old fix still works: call the vendor back on the number you already have. The scammer controls the email. Not the vendor's phone." | Landing strip: "Rice Robotics and Acme are fictional · no real money moves" | none |
| A4 | 0:31-0:35 | 4 s | RM `Title` | ERIC: "So we automated the call." | `Fictional customer · fictional vendor` | none |
| B1 | 0:35-0:45 | 10 s | SR `/demo` in present mode (`P`): pick fixture 01, send | ERIC: "This is Rice Robotics' accounts payable. I'm sending the scam email now, through the same code path a real email takes." | **SIMULATED** (injector chip) | none |
| B2 | 0:45-1:01 | 16 s | SR `/cases`: the new case opens, email evidence sweep, signals, both bills frozen, HELD ticker | ERIC: "Claude reads it and flags the bank change, and the rules flag it too. Both Acme bills, twenty-four thousand eight hundred dollars, go on hold. Ramp is a mock here, built against Ramp's Developer API." | **RAMP MOCK** chip | $24,800 from the DB (as A1) |
| B3 | 1:01-1:10 | 9 s | SR number-on-file card with provenance; 3 s cutaway to `/vendors` (Acme row, the quarantined "Never called" line); back to the case as it turns to calling | DANIEL: "It never dials a number from the email. It calls the one on Acme's W-9 from March 2025, the number we already had." | `Seeded vendor data` (add in edit) | "W-9 + vendor form, signed 2025-03-14": seeded provenance (`db/002_seed.sql`), shown in the `call.created` contact |
| C | 1:10-2:12 | 62 s | **HERO. Real call take (to be recorded).** 3 s on the phone ringing (LA), then split: left 40% the phone on the desk, right 60% the case's live call card and transcript. Zero cuts, 1x. **Fallback:** the recorded `fraud-live` run, labelled REPLAY (see "Fallback cut") | none. Live dialogue only (expected lines below) | **"Real call · no cuts · audio lightly cleaned"** + "A consenting teammate plays Acme. The agent says it is automated first." | Call length is whatever the take is; trim only ringing, and say so if more than 3 s is trimmed |
| D1 | 2:12-2:20 | 8 s | SR case after the call: BLOCKED stamp, ticker still HELD $24,800, decision bar with the plain-language reason | ERIC: "Acme says no. The case is blocked, and the twenty-four eight stays on hold." | **RAMP MOCK** | $24,800 from the DB |
| D2 | 2:20-2:27 | 7 s | SR release dialog on the same case: destination "account on file", press the hold-to-confirm button part way, let go | ERIC: "Only a signed-in person can release money, by holding this button. Never the model." | none | none spoken (the hold is 800 ms, `components/ui/HoldButton.tsx`) |
| D3 | 2:27-2:34 | 7 s | SR `/audit` (signed in): log check panel, "Log sealed", "Every case's status rebuilt from the log: N of N match", then the entry list | DANIEL: "Every step lands in one append-only log, and the audit page rebuilds every case from it." | none | N of N is whatever the page prints that day (`npm run audit:verify` printed 11 of 11 on production, 2026-11-10) |
| E1 | 2:34-2:41 | 7 s | SR `/cases?replay=voicemail`: voicemail greeting, outcome Unverified, a person gets a task | ERIC: "Voicemail: the agent says nothing about the request, and a person gets a task." | **REPLAY** + add in edit: `Generated scenario, not a recorded call` | none |
| E2 | 2:41-2:47 | 6 s | SR `/cases?replay=vague`: "I think so? I would have to check." Unverified, held | ERIC: "'I think so?' isn't a yes. Still held, and a person follows up." | **REPLAY** + `Generated scenario` | none |
| E3 | 2:47-2:55 | 8 s | SR `/cases?replay=impostor`: says yes, wrong digits (masked), held, needs a person | DANIEL: "Someone says yes, but can't give the right digits? Held, and sent to a person." | **REPLAY** + `Generated scenario` | none |
| E4 | 2:55-3:02 | 7 s | SR `/cases?replay=verified-live`: verified, "waiting for a person", then "Released by eric" (recorded real run of CC-0115, 2026-11-10) | DANIEL: "And when every check passes, the money still waits for a person." | **REPLAY** + `Recorded real call · released by a person` | `public/runs/verified-live.json` |
| F1 | 3:02-3:15 | 13 s | RM `Architecture` (scene of `Technical`): the flow draws on; the red dashed line from the email's number stops before `startCall` | DANIEL: "One Next.js app. Email arrives by a signed webhook, Claude returns typed JSON, and Retell places the call. The number in the email never reaches the dialer." | `RAMP MOCK · hold bills` on the Ramp node | none |
| F2 | 3:15-3:30 | 15 s | RM `Policy`: three real source excerpts (`nextState`, `decideOutcome`, `canRelease`), 5 s each | DANIEL: "The models only report. Plain TypeScript decides: an unhandled outcome won't compile. 'Confirmed' needs the right digits, no red flags, and a second reader that agrees. Even then, only a signed-in person releases the money." | `Real source · read at build time` (file:line on each card) | none (excerpts from `npm run video:data`) |
| F3 | 3:30-3:41 | 11 s | RM `Eval`: 20/20, 12/12, 0/4 (live), rules-only line, per-fixture list | DANIEL: "On our twenty hand-built emails, the live model got twenty of twenty, with no false alarms. With the model switched off, the rules alone still hold every bank change." | `Live · 2026-11-10 · claude-haiku-5-5 · N=20` and "Not a general accuracy claim"; list labelled `REPLAY · recorded extractions` | 20/20, recall 12/12, FP 0/4, p50 1.8 s: `npm run eval:live`. 16/20 with 12/12 held: `npm run eval -- --det-only`. Per-fixture list: `npm run video:data` |
| F4 | 3:41-3:57 | 16 s | RM `Assurance`: verifier, simulator, sealed log, each with its command | DANIEL: "We check the policy exhaustively: almost twenty-one million cases, zero unsafe releases. A seeded simulator loses, repeats and forges webhooks. It has found two real bugs. And the audit log is sealed, entry by entry, so a changed record shows up." | `Every number printed by the command under it` | 20,995,238 / 0 unsafe: `npm run verify:policy`. 200 seeds, 400 calls, 3,087 deliveries, 825 forged, 30 settled: `npm run sim -- --seeds 200`. 2 bugs: README §6. Chain intact, 11 of 11, 131 before the seal: `npm run audit:verify` (production, 2026-11-10) |
| G1 | 3:57-4:04 | 7 s | RM `Outro`: wordmark, four status chips | ERIC: "The old way depends on someone remembering to make a phone call." DANIEL: "CounterCall makes it, every time." | `Ramp: mock · calls: consenting teammates only` | none |
| G2 | 4:04-4:12 | 8 s | RM `EndCard`: live URL, judges path, repo, disclosures, names | none (room tone, fade) | `Ramp: mock · calls: consenting teammates only` | none |

**Runtime check:** 10+13+8+4 + 10+16+9 + 62 + 8+7+7 + 7+6+8+7 + 13+15+11+16 + 7+8 = **252 s = 4:12**. VO outside the call is about 520 words at roughly 2.5 words per second, with breath room in every beat.

The technical segment (F1 to F4, 55 s) is rendered as one piece: the `Technical` composition. `Draft` stitches every Remotion scene (A1, A2, A4, F1-F4, G1, G2) for timing review.

### Expected hero dialogue (from the recorded real call in `public/runs/fraud-live.json`; the take governs)

> AGENT: Hello, this is an automated assistant calling on behalf of Rice Robotics. This call may be recorded. Am I speaking with someone in accounts receivable at Acme Corp?
> ACME: Yes, speaking.
> AGENT: Thank you. Rice Robotics received a request to change Acme Corp's bank account for payments. The request arrived by email on Monday, November 9. Did someone at Acme Corp send that request?
> ACME: No, we haven't changed banks.
> AGENT: Thank you for telling us. We'll keep using the details we already have, and our team will look into the request. Goodbye.

`docs/video/captions.srt` holds the VO captions of the main cut (36 cues, times from this table). The hero call's captions come from the take's transcript events and are added in the edit; for the fallback cut, add its two VO lines and shift every cue after 1:10 by -22 s.

Improv card for ACME: "Answer 'Yes, speaking.' When asked about the request, say 'No, we haven't changed banks.' One natural filler is fine. Don't repeat the agent's words. Don't speed up." Burn in speaker-labelled captions from the case's own transcript events, not retyped.

## Fallback cut (no usable hero take)

Beat C becomes **1:10-1:50 (40 s)**: SR `/cases?replay=fraud-live` played from `&at=30` (call placed), 1x, through the BLOCKED stamp. The run has no audio, so DANIEL reads over it:

- 1:12 DANIEL: "This is a replay of a real call we placed on November 10th, to a teammate playing Acme."
- 1:30 DANIEL: "The agent says it's automated, asks whether Acme sent the request, and Acme says no."

Label: **REPLAY · recorded real call, 2026-11-10** (never "Real call · no cuts", which needs the real take and its audio). Every later beat moves 22 s earlier; total **3:50**. No Remotion change is needed: the scenes take their lengths, not their start times, from `MARKS`.

## Screen-recording shot list

Window 1280x720 at DPR 2 (the stage chip on `/demo` says OK), clean browser profile, extensions and notifications off, bookmarks bar hidden. Present mode: press `P` or add `&present=1` (bigger type, no footer, a cursor ring). Record 2 to 3 takes of each.

| Shot | Beat | URL | Where | Actions | Keep |
|---|---|---|---|---|---|
| S1 | A3 | `/?theme=THEME` | production or local | Hold on the hero 2 s, scroll slowly to "The call" section | 8 s of 12 s |
| S2 | B1 | `/demo?theme=THEME&present=1` | local or production with `DEMO_ENABLED=1`, signed in | Preflight green, pick fixture `01-obvious-bank-change-freemail`, click send | 10 s of 15 s |
| S3 | B2, B3, C (right pane), D1 | `/cases?theme=THEME&present=1` | same session as S2, `CALLS_ENABLED=1` | Let the new case open itself; do not touch the mouse from the email sweep to the BLOCKED stamp. Clap on camera at the start for sync | the whole take, about 90 s |
| S4 | B3 cutaway | `/vendors?theme=THEME` | live database (local or production; a replay has no vendor list) | Select Acme; hover the primary line's provenance, then the quarantined "Never called" line | 4 s of 8 s |
| S5 | C | phone on the desk | room | Tripod, exposure and focus locked, phone on a folded towel, Do Not Disturb off for calls only | the take |
| S6 | D2 | the hero case from S3 | signed in | Open release, choose "account on file", press and hold the button about halfway, let go. **Do not finish the release** on the hero case (if you need a finished release for the edit, do it on a throwaway case and `npm run demo:reset` afterwards) | 7 s of 12 s |
| S7 | D3 | `/audit?theme=THEME` | live database, signed in | Wait for the log check to finish ("Log sealed", "N of N match"), then scroll the entry list once | 7 s of 12 s |
| S8 | E1 | `/cases?replay=voicemail&at=35&theme=THEME&present=1` | anywhere | Press play in the replay bar; the outcome lands in about 4 s | 7 s |
| S9 | E2 | `/cases?replay=vague&at=37&theme=THEME&present=1` | anywhere | Same | 6 s |
| S10 | E3 | `/cases?replay=impostor&at=38&theme=THEME&present=1` | anywhere | Same | 8 s |
| S11 | E4 | `/cases?replay=confirmed&at=38&theme=THEME&present=1` | anywhere | Same; end on "waiting for a person" | 7 s |
| S12 | fallback C | `/cases?replay=fraud-live&at=30&theme=THEME&present=1` | anywhere | Press play at 1x, keep until the stamp | 40 s |
| S13 | backup for B2/B3 | `/cases?replay=fraud&at=24&theme=THEME&present=1` (then `at=30`, `at=36`, `at=41`) | anywhere | Only if S3 is unusable; label REPLAY and say "replay" in the VO | as needed |

`at=N` freezes a replay after event N; the replay bar's play button continues it at 1x.

After every live take: `npm run export-run -- <caseId> <name>` into `public/runs/`, and write the file name and the Retell call id in the take log.

## Pre-recording checklist (before every shoot session; 08 §8.5, PLAN §8.7)

1. The smoke run (08 §8.4) passed within the last hour, and `git log -1` is the deployed commit.
2. `RAMP_MODE=mock`, and the chip says **RAMP MOCK**, matching the VO.
3. Retell balance and the Anthropic limit checked. `ALLOWED_DEMO_NUMBERS` holds exactly the phones in the room.
4. **Tell the callee before every take** that a call is coming and that it is recorded; consent screenshot is in the Drive.
5. **`CALLS_ENABLED=1` only for the hero take** (local `.env.local`, or the Vercel env for a production shoot), and set it back to `0` right after. `RETELL_AGENT_ID` is set wherever the call is placed from.
6. `INBOUND_ALLOWED_SENDERS` contains the scam sender if the email is sent by real mail instead of the injector.
7. The callee's phone: ringer up, speakerphone default, voicemail greeting under 3 s, caller ID of the Retell number checked from a second handset (a fresh number can be spam-labelled).
8. Browser: clean profile, 1280x720 stage chip green, present mode on, reduced motion off, extensions and notifications off, bookmarks hidden, cursor ring on.
9. **`npm run demo:reset`**; the queue shows the seeded history and nothing else.
10. Two phones and a charger for a retry.
11. Audio: quiet room or closet, clap sync mark, written take log with Retell call ids.
12. Screen Studio (or Cap) permissions granted, 20 GB free disk.
13. After each take: `npm run export-run -- <caseId> <name>` and note the file in the take log.
14. Before any number appears in the edit: re-run the commands in "Numbers and their sources" and update `video/src/facts.ts` if anything changed.

## Pre-submission checklist (Tue 21:00-22:00; 08 §8.6)

- [ ] `npm run scan:secrets` prints nothing; the repo is public; `README.md` has all 12 sections with the `eval:live` table.
- [ ] A fresh clone runs `npm i && npm run verify` green.
- [ ] The production URL serves `/cases` read-only to a stranger and refuses `/api/demo/inject` without a session.
- [ ] AgentMail and Retell webhooks point at the **production** domain. Production `CALLS_ENABLED=0` again.
- [ ] The video opens in a private window, with captions, loudness at about -14 LUFS / -1 dBTP, and no spoken or on-screen figure that contradicts the database ($24,800; N=20).
- [ ] Both links work: YouTube Unlisted and the Drive MP4 ("Anyone with the link: Viewer"); the `.srt` is uploaded to YouTube.
- [ ] The form has the repo URL, the video URL and the demo URL.
- [ ] `git tag round2-submission` is pushed.

## Numbers and their sources

Re-run each command before the lock; if a result changes, change `video/src/facts.ts` (the Remotion scenes read only that file and `video/public/eval.json`), this table and `captions.srt` together.

| Number | Where it appears | Command or source | Last result |
|---|---|---|---|
| $24,800.00 (two bills of $12,400) | A1, B2, D1 | `db/002_seed.sql`; on screen from `payment.held` | seeded |
| 74% | A2 | AFP 2026 Payments Fraud and Control Survey (README §10) | sourced |
| 30% recovered most, 20% nothing | A2 | AFP 2026 (README §10) | sourced |
| $3.05B | A2 | FBI IC3 2025 Annual Report (README §10) | sourced |
| W-9 signed 2025-03-14 | B3 | seeded provenance, `db/002_seed.sql` | seeded |
| 20/20, recall 12/12, false positives 0/4, p50 1.8 s (max 2.7 s, $0.0041) | F3 | `npm run eval:live` (claude-haiku-5-5, N=20) | 2026-11-10, run by the lead |
| 16/20, 12/12 held, 4 benign to a person | F3 | `npm run eval -- --det-only` | 2026-11-10 |
| per-fixture pass list | F3 | `npm run video:data` (`eval/run.ts --json`, replay) | 20/20 |
| 20,995,238 cases, 0 unsafe releases (decideOutcome 20,991,600; nextState 3,318; canRelease 320) | F4 | `npm run verify:policy` | 2026-11-10, 41.8 s |
| 200 seeds, 400 calls, 3,087 deliveries, 825 forged, 30 lost-webhook strandings settled, all invariants held | F4 | `npm run sim -- --seeds 200` | 2026-11-10, deterministic |
| 2 real bugs found by the simulator | F4 | README §6 | documented |
| chain intact, 131 entries before the seal, 11 of 11 cases rebuilt | F4, D3 | `npm run audit:verify` (production) | 2026-11-10, run by the lead |

## Packaging (07 §6)

- Title: `CounterCall: an AI that phones your vendor before you wire the money | BBS x Ramp Hackathon`
- Export: 1920x1080, 30 fps, H.264, BT.709, AAC 48 kHz, -14 LUFS integrated, -1 dBTP; upload `captions.srt`; a smaller Drive copy.
- Description: use 07 §6.1 with these corrections: Ramp is a **mock** (no sandbox calls), the voice is **Retell**, the team is Daniel Yang and Eric Kim, chapter times from the beat table above, the hero label as recorded, and a "Prior art" line naming nsKnox, Trouvé and CallbackProof. Links: https://countercall-steel.vercel.app, https://countercall-steel.vercel.app/cases?replay=fraud, https://github.com/danielryang/countercall.
- Chapters: 0:00 The scam and the old fix · 0:35 Email in, payments held · 1:10 The real call · 2:12 Result and the audit log · 2:34 Voicemail, vague answers, impostors · 3:02 Under the hood · 3:57 Close.

## Render commands

```bash
cd video
npm run data                                   # policy excerpts + eval.json (replay)
npx remotion render src/index.ts Technical out/technical.mp4 --color-space=bt709
npx remotion render src/index.ts Draft out/draft.mp4 --color-space=bt709
npx remotion still src/index.ts Assurance out/assurance.png --frame=300
```

Remotion renders picture only; the master audio (VO, call, room tone) is mixed and loudness-normalized in ffmpeg (06 §6.7).
