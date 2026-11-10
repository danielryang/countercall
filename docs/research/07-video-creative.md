# 07 - Video creative: what the Round-2 video shows, and how the Nov 19 live final is presented

Author: research agent 07. Written and verified 2026-11-09 (all "access date" = 2026-11-09). Scope: story, structure, craft, AI-media policy, live-final plan, packaging. Tooling is 06's lane; app/UI is 04/05's; voice mechanics are 01's; stats/problem-fit are 03's. Cross-lane dependencies are listed in "Hand-offs" at the end.

Legend for confidence: **[V]** verified on a primary page or by direct inspection of the video's data; **[I]** inferred from inspected data; **[U]** unverified/third-party/single-source.

---

> **Patched 2026-11-09 after the independent review (`10-plan-review.md` H2):** the VO lines A/B/D/F and shot rows 3/13/20 now match `RAMP_MODE=mock` and the corrected AFP 2026 stats; amounts follow the seed DB ($24,800 = two Acme bills of $12,400). Where anything here conflicts with `PLAN.md`, PLAN wins.

## 0. The five decisions that matter most

1. **The hero is one real, uncut phone call, shown at 1x with the live transcript beside it.** The two closest precedents (Gibberlink, 14.2M views, ElevenLabs London hackathon winner; DispatchAI, UC Berkeley AI Hackathon 2024 Grand Prize) both won by letting a *real* call play in a nearly static frame. Everything else in our video exists to set up and justify that 60 seconds. Never ship a staged/faked call. If the live call is flaky, the fallback is *another real take*, not a mock.
2. **Frame the problem in 34 seconds, then show the product working before explaining it.** DispatchAI spent 3:19 of 4:34 on slides before the demo and still won, but its demo started at 73% of runtime. Ours starts at 28% (1:10) and the call is at 1:10-2:12.
3. **The technical segment (55s) is built around three artifacts, not adjectives:** the deterministic fail-closed policy rendered as real code with an exhaustive `default: HOLD`, the Ramp hold/release calls as real request/response from the sandbox, and the detector eval with honest N and known misses. Greptile's v5 launch (worked example + animated diagram + team on camera) is the structural model; Ramp engineers will weigh this most (35%).
4. **No generative video, no AI avatars, no AI VO.** The team's own voices; real screen recordings; Remotion for typography and diagrams only. One optional AI image (halftone handset art) is the only place generated pixels earn their keep, and it gets a disclosure line.
5. **Name: keep "CounterCall." Do not rename to "Callback."** A hackathon project literally named `callback` (repo title "Trouvé", SteelHacks XIII, 2026-09-19/20) already does vendor-bank-change -> hold -> call the number on file -> judge transcript, and "CallbackProof" is a commercial product. This is also prior art we must be ready to acknowledge (section 3.7 and Hand-offs).

---

## 1. Teardown of launch/demo videos

### 1.1 Method, and what I could NOT inspect (read this first)

- YouTube video/audio streams were **not downloadable** from this box (bot-check, HTTP 403; I did not try to bypass it with cookies). So for every video I **did not watch the actual pixels or hear the audio**.
- What I *did* do: (a) pulled each video's **YouTube storyboard sprite sheets** (public 160x90 thumbnails, ~1 per second, ~1 per 2s for videos >2 min) via yt-dlp metadata, stitched them into contact sheets and **looked at them**; (b) computed frame-to-frame change between consecutive thumbnails (mean abs diff > 18/255 on an 80x45 grayscale) as a "visible scene changes per minute" figure; (c) pulled YouTube **auto-captions** (VO transcripts with timestamps) and the **description/chapter markers** from each video's metadata.
- Limits: change-rate is a **floor** for fast-cut videos (sub-second cuts are missed at ~1 fps), and for live-action it is **inflated by motion**. Where captions were absent (Cursor, Linear, Raycast, Arc, v0) I cannot prove "no VO"; I mark it as likely music-only **[U]**. Music and SFX style are **inferred from absence of captions and context only**, never heard. Timestamps below come from tile index x sampling interval (+/-1-2 s) or from caption timestamps (exact to ~0.5 s).
- Not inspected at all: Stripe Sessions keynotes (long keynote format, not a model for a 4-minute build demo), Vercel Ship (only v0's 2023 intro was inspected), Mercury (only a 30s brand spot's captions were read, frames not viewed), Ramp Procurement-agents/Accounts-Receivable launch videos (not found/inspected), any real hackathon video beyond the two below.
- Contact sheets (each tile labeled by position; 8 columns): `/home/user/countercall/research/design/video-refs/*.png` (Ramp x4, Greptile x2, Linear x2, Cursor, Dia, Gibberlink, DispatchAI, Cluely, Granola, Raycast). Other agents can view them with the Read tool.

### 1.2 Inventory and measured pacing (access 2026-11-09)

| Video (YouTube id) | Uploaded | Runtime | Visible changes/min (floor) | Voice | Look in one line |
|---|---|---|---|---|---|
| Ramp - Agents, Explained (`nKcH-qXfwic`) | 2025-07-10 | 1:39 | ~34 | Yes, employees on camera | Lime "monolith" set, real staff, kinetic type, jokes |
| Ramp - Agents, Now for AP (`FMa6Xozo7AI`) | 2025-10-07 | 1:50 | ~25 | Yes, employee interviews | Same set, one-word kinetic cards, UI crops, burning-cash b-roll |
| Ramp - Introducing Treasury (`Lmixruu_ISU`) | 2025-01-22 | 1:05 | ~18 | Yes (VO) | Vertical 9:16, black + lime, serif/sans kinetic type |
| Ramp - Introducing Stack (`1VfXDA_5PaQ`) | 2026-06-03 | 1:07 | ~4 | None in captions [U] | Cream UI, visible black cursor, lime gradient title |
| Ramp - Bill Pay Series: AP Agent (`ayjnY1g6XLo`) | 2025-12-04 | 2:43 | ~1 | Yes (PM VO) | Plain long-take screen recording walkthrough |
| Ramp - Meet Ramp (`yazRO0jRTag`) | 2024-10-15 | 2:38 | ~8 | Yes, polished narrator | Product tour, UI tiles on sky-blue gradient |
| Cursor - Introducing Cursor 2.0 (`An8IM-kPyms`) | 2025-10-29 | 1:04 | ~5 | None in captions [U] | Cream sentence-case title cards between continuous UI recordings |
| Linear - Introducing Linear for Agents (`sbwOQV5zY34`) | 2025-05-21 | 0:33 | 0 | None [U] (Hound Studio write-up also says no VO [U]) | Dark flat UI, 2-3 word title cards |
| Linear - Introducing Linear Agent (`mRql2VJ99gM`) | 2026-03-24 | 0:55 | ~1 | None in captions [U] | One continuous 3D-tilted camera move through dark UI |
| Greptile - Introducing v5 (`iG8RTLJlTSE`) | 2026-09-16 | 1:27 | ~31 | Yes, Greptile team members on camera (lower-thirds show name + role) | Garden set, lime/pink/mint kinetic cards, animated agent diagrams |
| Greptile - Security Review Agent (`kNhfGJb-cow`) | 2026-09-23 | 0:36 | ~30 | Yes, team members on camera | Same, plus grey diagram canvas, moire/dither end card |
| Raycast - New Raycast. Coming 2026 (`Mi173xGb0ZA`) | 2025-12-18 | 0:39 | ~23 | None in captions [U] | Black, macro-crop UI, tiny mono "NEW <FEATURE>" labels |
| Granola - Say hello to Recipes (`ekSyfD7uoiU`) | 2025-09-30 | 0:43 | ~21 | Yes, presenter in living room | Soft green gradient UI cards + presenter jump cuts |
| The Browser Co. - Dia, Never Explain Yourself Again (`YVOw0TAO9ok`) | 2025-06-11 | 1:18 | n/a (live action; motion-inflated) | Yes, VO over film | Cinematic live-action family scene, product reveal at 0:38 |
| The Browser Co. - Arc 1.0, Everything or nothing (`n5Vwrj1gEWs`) | 2023-07-25 | 0:34 | ~44 | None in captions [U] | Archival b/w film + serif type + UI collage |
| Vercel - Introducing v0 (`By9wCB9IZp0`) | 2023-10-11 | 0:48 | ~9 | None in captions [U] | Black prompt pill typing, white flat UI |
| Cluely - launch (`Rz3LD7u2KX8`) | 2025-04-20 | 1:39 | ~20 | Diegetic dialogue only | Live-action date scene, HUD overlay composited |
| **Gibberlink** (`EtNagNezo8w`) | 2025-02-23 | 1:10 | ~0 (one locked shot) | The two AI agents' real voices | Phone + laptop on a wooden desk, captions burned into frame |
| **DispatchAI** (`hdpdgxrilQM`) | 2024-06-25 | 4:34 | ~11 (2s sampling) | Founder on stage + demo VO | Phone-filmed stage pitch, then screen recording + facecam bubble |

### 1.3 Detailed teardowns (the 10 that matter)

**1. Ramp - "Agents, Explained" (1:39) [V metadata + captions + frames]**
Chapters (from the description, exact): 0:00 Defining AI agents / 0:08 Automating expense policy / 0:38 Policy optimization and Q&A / 1:01 Monitoring agent performance / 1:18 Impact on finance teams.
Beats: 0:00-0:08 cold open with "Cue the buzzwords" and giant "Agents / AI agents" kinetic type (self-aware joke about hype); 0:08 olive card "What even is an agent?" - one employee answers, definition on a "LLM (Large Language Model) +" card; 0:21 cream card "like an associate", olive card "They can do stuff for me?" (a host voice asks the audience's naive questions as on-screen cards); 0:25-0:44 policy agent with a white "Expense Policy" UI card crop; ~0:48 olive tile wall of "cool cool cool"; 0:49-1:00 phone mockup chatting "is this dog in policy?" (iPhone frame with a dog photo - the line is in the captions); 1:01-1:18 dashboard crops; ~1:22 and ~1:28 censored "Bull**!t" kinetic-type gag; 1:34 music; ~1:36-1:39 "Join the waitlist at ramp.com".
Pacing ~34 changes/min. UI shown as clean white card crops flat to camera (no tilt), usually 2-4 s, never full-screen recordings. Type: huge grotesque sans in cream/lime, lowercase interstitials, dark olive cards with lime text. Music: present (caption "[Music]" at 1:34). VO: **no narrator; it's Q&A with employees on a lime yellow set** (Ramp brand lime is `#e4f222` per our captured CSS in `design/ramp-home-data.json` **[V]**). Human feel: real people with fidgets, jokes, a "naive question" cards device, specific absurd examples ("chair / desk / dog in policy").
Steal: self-aware hype joke in 5 s; naive-question cards; specific absurd example; a dry joke is *on-brand for Ramp*.

**2. Ramp - "Agents, Now for AP" (1:50) [V]**
Same lime set, interviewees (distinct employees), one-word kinetic cards synced to claims: 0:15 "Agents" (with lime cursor block), ~0:24 "Combing" (wordsmear), ~0:33 burning pile of cash (literal b-roll for "waste of the company's money"), 0:36 "Goodbye manual coding", ~0:51 "Catching fraud" on a red-purple gradient, ~1:03 "One click approvals", 1:24 "Get paid to pay bills" with flying cash, ~1:33 "cashback" on lime, ~1:45 "Put agents to work", ramp.com. Claims are specific numbers ("63 different pieces of data" - the sister video says "60 plus signals"). Each agent = one UI crop + one human + one kinetic card.
Steal: **one claim -> one UI crop -> one card**; specific numbers.

**3. Greptile - "Introducing v5" (1:27) [V captions + frames]** - the model for our technical segment.
0:00 "Today we're launching Greptile v5. It catches more bugs, produces fewer false positives, and it's twice as fast" over two Greptile team members seated outdoors; 0:06-0:10 kinetic stat cards "3k" and "2 min FOR A FULL REVIEW"; 0:09 "Here's how we built it"; 0:11-0:21 core idea ("agents can only do one thing well at a time") with a diagram building node by node on a lime-green animated grid; 0:22-0:43 **one concrete worked example** (a personal-finance app, PDF bank-statement upload) with three sub-agent hypotheses, each shown as an animated diagram on a pink or grey canvas with mono labels "SUBAGENT #1/#2"; 0:43 "T-REX" kinetic glitch-type; 0:56 Knowledge Base blue card; 1:03 evidence flows to "PARENT AGENT" with P0/P1/P2 chips; 1:17 "v5 is available to all users today"; 1:23 mint end card with logo + greptile.com.
Pacing ~31/min. Diagrams: thin outlines, mono small-caps labels, accent-filled chips, drawn on rather than faded in. The speakers talk plainly; the explanation is a **story with a concrete bug**, not a feature list. Music underneath ("[music]" in captions).
Steal: concrete worked example inside the architecture; labels in mono; draw-on diagrams; people on camera **at least once**.

**4. Greptile - "Security Review Agent" (0:36) [V]**
0:00-0:03 two team members + "Security Launch" over moire-line background; 0:04-0:15 speaker A with name lower-third; 0:16-0:25 grey canvas: "Static Analysis" node -> code blocks -> "SCA Analysis" node -> CVE chips (a 10-second architecture explainer, all in the product's own visual language); 0:26-0:36 speaker B talks, then "Now included by default for all Greptile users" kinetic type, end card dither/moire with logo + greptile.com. Proves a 36-second feature video can carry an architecture beat.

**5. Linear - "Introducing Linear Agent" (0:55) and "Linear for Agents" (0:33) [V frames, U audio]**
Agent: ~0:00-0:04 flat app; 0:04-0:44 **one continuous perspective-tilted camera move** through dark UI, captions are 2-3 word tiny white labels ("Project open."); 0:45-0:49 "Linear. At your command."; logo. Changes/min ~1: the "cut rate" is zero because the camera is the edit. For Agents: dark flat UI, sentence-case title cards ("Agents for DevOps", "Agents for Planning"), logo at ~0:31. No captions on either **[U]**. Hound Studio (secondary, **[U]**) calls Linear's launch style "dark-mode UI, crisp on-screen type, ambient sound, one job shown clearly".
Steal: type + restraint + show one job. Don't steal: no-VO; our call needs words.

**6. Cursor 2.0 (1:04) [V frames]**
~0:00-0:04 cream card with cube logo + "2.0"; ~0:04 "Introducing Composer, our first agent model." + bar-chart benchmark card (~0:06-0:09, the only "proof" shown); ~0:10 "And a new Cursor built for agents."; ~0:19 "Run a task across multiple models."; ~0:33 "Review changes in a single place"; ~0:43 "Work with a built-in browser."; ~1:02 black + logo. ~5 changes/min: each sentence card is followed by 10-14 s of continuous UI recording over a desktop wallpaper. No VO captions **[U]**.
Steal: one sentence per feature card, then **let the real recording run**.

**7. Dia - "Never Explain Yourself Again" (1:18) [V captions + frames]**
0:00-0:38 live-action short: a family cooking for a feast, kitchen panic, dad's allergy list; VO is a first-person comedic confession; ~0:20-0:35 chat-UI insert (cream) typing the recipe, "put in all of Dad's email so it fits the theme"; 0:35 "Only then did I remember." 0:38 "My browser knew all this already."; ~0:48 "Dia already knows"; ~0:58 "The AI browser that's always up to speed"; ~1:02 "Never explain..."; 1:06-1:12 feast; 1:14 logo + diabrowser.com. Product on screen for ~20 of 78 s. Warm teal/red grade, 24 fps feel, actors.
Steal: **story first, product as the punchline** - but we can't afford actors; our equivalent is a real person (Saketh) answering a real phone.

**8. Granola - "Say hello to Recipes" (0:43) [V captions + frames]**
Presenter in a living room (red sofa, plants), jump cuts every 2-3 s to soft-green UI cards; 0:02 "Today, we're announcing recipes."; floating "Recipes" chips; 0:23 "worked with people we admire" -> cards with real creators' faces; 0:33 presenter closes ("I found it feels fundamentally different..."); 0:38 "Try a recipe today"; logo with blinking text cursor (the brand's cursor motif). One person, one take, honest-sounding delivery.
Steal: single human, plain words, first-person sincerity; **brand motif = text cursor**.

**9. Gibberlink (1:10) - hackathon winner, closest analog [V metadata, frames]**
Description: "Winner of ElevenLabs 2025 Hackathon London"; stack ElevenLabs Conversational AI + OpenAI LLM + Next.js; code on GitHub. Video is **one locked-off shot**: a laptop and a phone on a wooden table; two AI agents talk (hotel booking); **captions are burned into the frame** with a blue dot (hotel agent) and red dot (caller agent); at ~0:22 the caller offers "to switch to Gibber[link]", ~0:31 both screens flip to ggwave text, ~1:07 fade out. No title card and no logo in the frames I saw; audio beyond the agents' voices not inspected. 14.2M views.
Steal (big): **a real phone/laptop in one shot is more convincing than any motion graphic; burned-in captions make real call audio legible; no edit = credibility.**

**10. DispatchAI (4:34) - UC Berkeley AI Hackathon 2024 Grand Prize + AI for Good + Best Use of Intel AI [V description, frames, captions]**
Phone-filmed stage pitch: 0:00 title card with product UI; 0:11 intro; 0:16-0:50 stats ("over 80% of 911 call centers critically understaffed", Oakland 60 s wait); 0:51 "that's why we built DispatchAI"; 1:02 two components (voice AI + dashboard); 1:28-2:25 dashboard feature walk; 2:26 ethics + fine-tuning; 2:55 architecture slide; 3:16 "so talking about this is hard, so why not try to do a demo" -> **3:19-4:31 live demo**: presenter dials from his own phone ("I have my phone here with me and I will call our agents"), dashboard updates with live transcript on the right and map + summary on the left; **the first attempt failed ("it didn't seem to work this time, let's try again" at ~4:10) and they retried on camera.** Won anyway.
Lessons: Berkeley judges rewarded a **live call + live dashboard transcript** (the same two things we will show); a visible retry did not sink it; but burying the demo at 73% runtime is a mistake we won't repeat; a recorded-with-phone stage video looks homemade (for us: use clean screen capture).

**11. Cluely launch (1:39) [V frames + captions] - the comedy/story counter-model**
Live-action date in a dim restaurant; HUD composited as a translucent blue frame at ~0:03; escalating lies ("30 years old"), green "Continue conversation" / red "Escalation likely" chips; no narrator; end card "Invisible AI to Cheat on Everything". ~20 changes/min. Shows how far *scripted human acting* travels (194k views). Controversial brand; not a tone fit for finance.
Steal only: a **diegetic HUD chip overlay** idea (our status chips: HELD / CALLING / BLOCKED).

**12. Raycast (0:39) [V frames, U audio]** - macro crops of UI over a glossy black wallpaper, 1-3 s per feature, then ~12 s of black cards with tiny mono "NEW  CLIPBOARD HISTORY" style labels and "NEW RAYCAST COMING 2026". Steal: tiny mono labels, hard cuts, black.

**13. Ramp "Stack" (1:07) and Ramp Bill Pay Series (2:43) [V frames]** - Stack shows a **visible black arrow cursor** doing real agent flows on cream UI; no spoken captions. The Bill Pay Series is the opposite: 2:43 of steady screen recording with a PM voiceover (low cut-rate, ~1/min), high information density, Ramp's own **internal-feeling "how it works"**. This is what a Ramp engineer is used to watching: plain, specific, no flourish.

### 1.4 What the teardown says to do (synthesis)

| Pattern | Seen in | Use in ours |
|---|---|---|
| Real humans or the real product; almost no stock/AI b-roll | Ramp, Greptile, Granola, Gibberlink, DispatchAI | Our own faces, our own phone, our own screen. Zero stock. |
| One claim per card, then let real UI run | Cursor, Ramp, Linear | Sentence-case cards, 2-3 s, then 8-12 s of live recording |
| Concrete worked example inside the architecture explanation | Greptile v5 | The $24,800 Acme bill is the example in the tech segment too |
| Brand motif carried by type, not decoration | Granola (cursor), Raycast (mono labels), Greptile (mono chips) | Our product's Space Mono labels + dashed hairlines in motion graphics |
| Cut rate varies 0 -> 34/min *within* a video | Ramp (fast cards, slow UI), Linear (0), Greptile (31) | Fast on problem and tech cards (~15-20/min), **zero cuts on the call** |
| Self-aware humor | Ramp ("cue the buzzwords", "is this dog in policy?") | One or two dry lines, not a skit |
| People on camera at least once | Greptile, Granola, Ramp, DispatchAI | Eric/Daniel/Saketh appear: Saketh *is* Acme on the call; one 3-person end shot |
| Real in-frame captions for real audio | Gibberlink | Burned-in speaker-labeled captions on the call |
| End card = logo + URL, short | all | Wordmark + repo URL, 3 s hold |

---

## 2. Why AI-generated video looks AI

Sources: general write-ups (vendor blogs, **[U]** for all statistics; only the qualitative tells are consistent across them) - salesaicourse.com, echonos.ai, resource.digen.ai, sozee.ai (search result list, access 2026-11-09) - plus what our own teardown shows human-made videos *do instead*.

**Tells (visual)**
1. **Avatar/talking-head presenters**: eyes that move too smoothly or stare too steadily, skin as texture over geometry, lip-sync loosely matched to audio, worst in tight framing.
2. **AI stock b-roll** (Veo/Kling-style): floating subjects, feet detached from the ground, hands with extra/fused fingers (especially holding objects), cloth/hair physics wrong, identity drift between shots.
3. **Over-smooth camera**: constant-speed push-ins and drifts on everything; real handheld has micro-correction, real screen recordings have a *cursor* with hesitation.
4. **Glossy 3D blobs, glass spheres, purple-blue mesh gradients, neon glow, "floating UI cards" with drop shadows.**
5. **Fake UI**: generated dashboards with unreadable gibberish text, charts with no axes, round-number data. (Ours must always be the real app, real data, readable.)
6. **Uniform rhythm**: every shot 3 s, every element enters with the same spring/ease, everything centered, nothing holds.
7. **Uniform polish**: no one shot is allowed to be slightly ugly (every frame equally cinematic).

**Tells (audio)**
8. **VO prosody**: even pacing, sentence-final lift, no breaths, mis-stressed numbers/acronyms ("$24,800", "ACH", "AP", "BEC"), over-articulation, emotionless transitions.
9. **Generic whooshes/risers on every transition and stock "inspirational corporate" music from second 0.**
10. **Silence that is too clean**: no room tone.

**Tells (copy)**
11. "Seamlessly", "In today's fast-paced world", "Imagine a world where", triple-adjective lists, em-dash cadence, emoji bullets, "supercharge/unlock/revolutionize".

**Avoid-list (binding for our storyboard)**
- No AI avatars, no AI-voiced narration, no AI "AP clerk" faces, no Veo/Kling/Runway clips.
- No fake dashboards: every UI pixel is a screen recording of the real build (or Remotion-rendered *from real data*, e.g. the policy table is generated from the actual policy file).
- No whoosh SFX. Real sound: keyboard, mouse click, the phone's actual ringtone/vibration. A status chip change may get a soft *recorded* tick, not a synth blip.
- No music under the call. No music with a riser/drop. If music, one sparse track, in acts A and F only, ducked -18 dB under VO.
- Max **two easing curves** in all motion graphics (ease-out-cubic in, ease-in-cubic out) and **no spring/bounce**. Hard cuts for most transitions.
- Type: one display face + one mono (match product tokens from 04). No gradient text, no glow, no drop shadows on type.
- Leave in: breaths, a flubbed-then-restarted word if it sounds natural, room tone, cursor wobble, the real 1-second latency on the call.
- Copy: write in the team's spoken voice (section 3.3). Read every line aloud; if nobody on the team would say it at lunch, rewrite it.
- Don't "enhance" speech with AI denoisers (they leave a watery artifact that reads as synthetic); high-pass at 80 Hz, a light compressor, leave the room tone.

---

## 3. The Round-2 video (target **4:12**, acceptable 3:30-4:30)

Rubric mapping: technical execution (35%) = hero call + tech segment (1:10-2:12 and 3:02-3:57, ~2 min); problem fit (25%) = act A + Ramp integration; polish (20%) = type system, burned-in captions, no dead air, honest labels; creativity (10%) = a real phone call is the product; presentation (10%) = the team's own voices, plain delivery.

### 3.1 (a) Beat outline

| # | Time | Beat | Length | Cuts |
|---|---|---|---|---|
| A | 0:00-0:34 | **Problem + the old fix** (email, the payment, two stats, "call the number you have") | 34 s | fast, ~15/min |
| B | 0:34-1:10 | **It works: pipeline in one pass** (send the email live; detect; hold via Ramp; pull trusted number; call placed) | 36 s | screen-rec, few cuts |
| C | 1:10-2:12 | **HERO: the real call** (split screen: phone on desk + live transcript) | 62 s | **zero cuts** |
| D | 2:12-2:32 | **Result**: held, flagged, audit log, Ramp bill "on hold" | 20 s | 3 cuts |
| E | 2:32-3:02 | **Fail closed**: voicemail, vague, impostor who can't pass the challenge | 30 s | 3-up grid |
| F | 3:02-3:57 | **Under the hood** (architecture, policy code, Ramp calls, eval) | 55 s | ~20/min |
| G | 3:57-4:12 | **Close + end card** | 15 s | 2 |

### 3.2 (b) Shot list

"How made": **SR** = real screen recording of the build; **RM** = Remotion graphic (from real data where possible); **LA** = live-action phone footage; **AI** = AI-generated (one row only, optional). Fonts/colors = product tokens from 04 (assumed Anybody / DM Sans / Space Mono, bg `#E9E9E9`, ink `#3D3B4F`, mint `#28E99F`; swap if 04 changes). Timecodes are the target; VO is a draft (3.3).

| # | Time | Visual | On-screen text | VO / dialogue | Audio / SFX | Transition | Asset needed | How made |
|---|---|---|---|---|---|---|---|---|
| 1 | 0:00-0:08 | Close on an email in a thread ("RE: Invoice INV-4471"), the new account number highlighted by a hand-drawn-feel box animating on; cursor scrolls once | `RE: Invoice INV-4471` / `New account: ****-8812` (mono, small) | ERIC: "Your vendor emails: 'We switched banks, send this month's payment here.' Same logo. Same thread." | Room tone, one real keyboard click | hard cut | Email render of the scam message (from the real app inbox) | SR |
| 2 | 0:08-0:14 | Ramp-style bill row: Acme Industrial Supply, **$24,800.00**, "Scheduled Fri Nov 13"; cursor hovers Approve | `$24,800.00` `Scheduled: Fri` | ERIC: "So you pay it. And it was never your vendor." | click sound on hover-stop (real) | hard cut | Ramp sandbox bill page (03/08) or our own bill row | SR |
| 3 | 0:14-0:24 | Two white stat cards, big numerals, source in mono under each, drawn on by a thin line | `~3 in 4` `organizations hit by BEC, 2025` / `3 in 10` `fraud-hit companies recovered most of what they lost, 2025 (AFP 2026)` + source footers | DANIEL: "Business email compromise hit about three in four organizations in 2025. Only three in ten companies hit by payments fraud got back most of what they lost, and one in five got nothing back." | none, room tone | cut | **Stats exactly as 03 verifies; if a number can't be sourced, cut it** | RM |
| 4 | 0:24-0:34 | Split card: left struck-through `phone number in the email`, right `phone number on file since Mar 14` pulsing mint | `The email can lie.` / `The number on file can't.` (optional, see note) | SAKETH: "The fix is a phone call, to the number you already have. Scammers control the email. They don't control Acme's real phone line." | none | cut | Two numbers from the seeded vendor directory | RM (numbers from fixture) |
| 5 | 0:34-0:38 | Wordmark `CounterCall` types in, mono tagline | `CounterCall` / `we make the call` | ERIC: "So we automated the call." | one soft low tone (the only designed sound) | hard cut | Logo/wordmark SVG (04) | RM |
| 6 | 0:38-0:52 | Full-screen dashboard inbox. Eric's hand-driven cursor opens a compose window and **actually sends** the email from shot 1; email lands in the CounterCall inbox | `Sending...` then live clock `00:03` in the corner | ERIC: "Here's Rice Robotics' AP inbox. I'm sending the scam email now - a reply in a real thread, new account number." | keyboard, click | none (continuous) | Dev-only "send scam email" scenario (02/05) + visible live clock | SR |
| 7 | 0:52-1:02 | Case card builds itself in real time: DETECTED -> signals listed (bank-change phrase, account number differs, urgency) -> **HELD** chip with the Ramp API call chip `POST /bills/{id}/hold 200` | `DETECTED` `HELD` `POST /developer/v1/bills/{bill_id}/hold 200` | ERIC: "CounterCall read it, caught the bank change, and put a hold on the Acme bill through Ramp's API." | soft recorded tick per chip (optional) | none | Case-view states DETECTED, HELD; API chip (05) | SR |
| 8 | 1:02-1:10 | Vendor panel: `phone on file: +1 (415) ... added 2026-03-14` vs `phone in email: ignored`; status flips to CALLING with ring timer | `CALLING - number on file` | DANIEL: "It ignores the number in the email and calls the one we've had on file since March." | none | continuous | Trusted-number panel + CALLING state (05) | SR |
| 9 | 1:10-1:14 | **LA**: phone on a desk, screen lights up, buzzing on the wood. Caller ID shows the real number/CNAM | none (a small mono label arrives at 1:12) | (silence) | the phone's real vibration + ringtone | hard cut | Real phone footage: take selected from 5-6 | LA |
| 10 | 1:14-2:08 | **Hero split screen**: left LA (phone on desk, Saketh's hand answers, speakerphone), right live dashboard transcript streaming with speaker labels; status chips advance IN CALL -> CONFIRMED NO CHANGE -> BLOCKED. Locked shot, no cuts | bottom strip mono: `REAL CALL - NOT SCRIPTED - 1x` + running timecode `00:41`; caption plate burned into frame (Gibberlink style) | AGENT/ACME live (see 3.5) | real call audio, nothing else | none | Hero take (LA + SR + audio, synced by clap) | LA + SR |
| 11 | 2:08-2:12 | Hold on `BLOCKED` chip full-frame; one beat of silence | `BLOCKED` | (silence) | room tone | cut | Outcome state (05) | SR |
| 12 | 2:12-2:20 | Case page after the call: transcript saved, email flagged `FRAUD - vendor denied`, audit entry with timestamps | `email flagged` `transcript saved` `audit #0xx` | ERIC: "Payment's still held. The email's flagged as fraud, the transcript's in the audit log." | none | cut | Audit log view (05) | SR |
| 13 | 2:20-2:32 | **Ramp side (mock)**: the JSON of the hold request/response in a terminal card, chip `RAMP MOCK` (show the Ramp sandbox page ONLY if G3 switched to sandbox) | `RAMP MOCK` `status: held` | ERIC: "Both Acme bills still say ON HOLD, in our mock of Ramp's API. Nobody had to remember to make a phone call." | none | cut | Terminal card of the mock hold response labelled RAMP MOCK (sandbox UI only if G3 switched) | SR + RM |
| 14 | 2:32-2:42 | 3-up grid, labeled **V1 / V2 / V3**: V1 phone rings out -> voicemail; V2 "uh, I think so?"; V3 an impostor answers. Each pane: 6-8 s highlight from a *real* recorded call, burned-in caption | `VOICEMAIL -> UNVERIFIED -> human task` | SAKETH: "Voicemail: held, and a human gets a task." | the three real audios, ducked under VO | cut | 3 real recorded calls (variants, 3.6) | LA + SR |
| 15 | 2:42-2:52 | Pane V2 grows: `UNCLEAR -> HELD` | `UNCLEAR - HELD` | SAKETH: "'I think so?': held." | audio of V2 | cut | V2 take | SR |
| 16 | 2:52-3:02 | Pane V3 grows: `challenge failed -> HELD + escalated`; shot ends with a line on screen | `There is one path to money moving. It isn't the model's opinion.` | DANIEL: "Someone answers but can't tell us the last invoice number? Held and escalated. The model never releases money." | none | cut | V3 take | SR + RM text |
| 17 | 3:02-3:11 | Architecture diagram draws on, left to right, thin lines, mono labels (see 3.8) | `INBOUND EMAIL -> DETECTOR -> POLICY -> RAMP /hold -> VOICE AGENT -> OUTCOME -> POLICY` | DANIEL: "Emails come in by webhook and Claude reads each one with structured output, so the detector hands back a typed verdict, not prose." | none | draw-on | Architecture JSON (08) | RM |
| 18 | 3:11-3:22 | Policy table fills from the **real policy file**; the matched rule for our case highlights; last row `* anything else -> HOLD` | `policy.ts` `default: HOLD` | DANIEL: "That verdict goes to a policy function. Plain TypeScript, no model in the loop. Anything unclear, anything we didn't plan for: the default is hold." | none | cut | Real policy source + test file (08) | RM |
| 19 | 3:22-3:26 | A 6-line code card: `switch(outcome){... default: { const _x: never = outcome; return HOLD } }` | `exhaustive switch: compile error if an outcome is unhandled` | DANIEL: "The voice model only reports what it heard. Our code decides what happens." | none | cut | Code snippet from repo | RM |
| 20 | 3:26-3:36 | Terminal card: request/response **shapes from Ramp's OpenAPI** (mock responses, labelled `RAMP MOCK`; real `demo-api.ramp.com` only if G3 switched to sandbox): bills hold, then release; below, the OpenAPI line "Blocks all payment rails on a bill and deschedules payments." | `POST /developer/v1/bills/{bill_id}/hold` `POST .../release` | DANIEL: "Holds and releases go through Ramp's bill endpoints, so the bill you see in Ramp is the one we control." | none | cut | Captured sandbox request/response (02/08) | RM from real log |
| 21 | 3:36-3:50 | Eval card: `N emails / bank-change recall / false positives` + a "known misses" row listing 2-3 real failures | `Detector eval - N=__ - recall __/__ - FP __/__` `known misses: ...` | DANIEL: "We tested the detector on [N] emails, including [sneaky ones]. It caught [a of b], with [c] false alarms. Here are the ones it still misses." | none | cut | Numbers from 02's eval run; **no number not produced by a script** | RM |
| 22 | 3:50-3:57 | Mono disclosure line over the diagram | `All calls: teammates who consented. Agent states it is automated.` | DANIEL: "Every call in this video went to a teammate who agreed, and the agent says it's automated every time." | none | cut | n/a | RM |
| 23 | 3:57-4:09 | Three of us at a desk or standing, one wide static shot, phone between us (real) | none | ERIC: "The old way runs on someone remembering to make a phone call." DANIEL: "The new way makes that call on every request." SAKETH: "CounterCall. Let's stop paying scammers." | room tone | hard cut | One real wide shot of the team | LA |
| 24 | 4:09-4:12 | End card (3.9) | see 3.9 | (none) | one sustained tone fades | fade to black | Logo, URLs | RM |

Note on shot 4: the on-screen sentence is optional; if it reads like a tagline, delete it and let the two numbers (struck-through vs on-file) speak.

Runtime check: sum of rows = 4:12. Words of VO excluding the hero call: ~390 (~2.5 words/s with pauses), which leaves breath room.

Cut rate target: act A ~15/min, B ~6/min, C 0, D ~9/min, E ~12/min, F ~20/min, G ~8/min.

### 3.3 (c) Full VO script (team voices; mirrors the Round-1 tone)

Recorded by the three of us, not AI. Read-aloud rule: contractions, short sentences, one dry line. Numbers spoken as people say them.

**A. Problem (0:00-0:38)**
ERIC: Your vendor emails: "We switched banks, send this month's payment here." Same logo. Same thread.
ERIC: So you pay it. And it was never your vendor.
DANIEL: Business email compromise hit about three in four organizations in 2025. Only three in ten companies hit by payments fraud got back most of what they lost, and one in five got nothing back.
SAKETH: The fix is a phone call, to the number you already have. Scammers control the email. They don't control Acme's real phone line.
ERIC: So we automated the call.

(Numbers verified by 03 s3.1: AFP 2026 survey, 74% hit by BEC in 2025; 30% of fraud-hit companies recovered more than 75%, 20% recovered nothing. The Round-1 "22%" line is stale; do not use it. [patched 2026-11-09 after review 10 H2])

**B. Pipeline (0:38-1:10)**
ERIC: Here's Rice Robotics' AP inbox. I'm sending the scam email now. It's a reply in a real thread, with a new account number.
ERIC: CounterCall read it, caught the bank change, and froze the two Acme bills. Ramp is mocked in this demo; the calls follow Ramp's published Developer API.
DANIEL: It ignores the number in the email and calls the one we've had on file since March.

**C. Hero call (1:10-2:12)** - no VO. Live dialogue (3.5).

**D. Result (2:12-2:32)**
ERIC: Payment's still held. The email's flagged as fraud, the transcript's in the audit log.
ERIC: Both Acme bills still say ON HOLD, in our mock of Ramp's API. Nobody had to remember to make a phone call.

**E. Fail closed (2:32-3:02)**
SAKETH: Voicemail: held, and a human gets a task.
SAKETH: "I think so?": held.
DANIEL: Someone answers but can't tell us the last invoice number? Held, and escalated. The model never releases money.

**F. Under the hood (3:02-3:57)**
DANIEL: Emails come in by webhook and Claude reads each one with structured output, so the detector hands back a typed verdict, not prose.
DANIEL: That verdict goes to a policy function. Plain TypeScript, no model in the loop. Anything unclear, anything we didn't plan for: the default is hold.
DANIEL: The voice model only reports what it heard. Our code decides what happens.
DANIEL: Holds and releases are built against Ramp's bill endpoints. Here it runs against a mock; the sandbox is next.
DANIEL: We tested the detector on [N] emails, including [sneaky ones like "remit to our new account" in a forwarded thread]. It caught [a of b], with [c] false alarms. Here are the ones it still misses.
DANIEL: Every call in this video went to a teammate who agreed, and the agent says it's automated every time.

**G. Close (3:57-4:09)**
ERIC: The old way runs on someone remembering to make a phone call.
DANIEL: The new way makes that call on every request.
SAKETH: CounterCall. Let's stop paying scammers.

Recording protocol: closet or car (soft surfaces), phone mic 15 cm away, sock as pop filter, read from paper, two takes of every paragraph, record 30 s of room tone, keep the breaths. Daniel does all of F in one sitting so his energy is continuous.

### 3.4 Dry-humor budget
One joke in A ("Same logo. Same thread." is the setup; no extra joke needed), one in D ("Nobody had to remember to make a phone call"). Ramp's own videos joke ("is this dog in policy?", "cue the buzzwords"), so a dry line fits their culture; a skit does not.

### 3.5 (d) The hero moment: a real phone call, and how to film it

**The set-up.** Saketh plays Acme's AP contact; Daniel films; Eric drives the app. All three consent on camera before take 1 (also covers California all-party-consent recording; the agent announces "this call may be recorded" per 01).

**Shot design (one continuous take, 1x speed):**
- Canvas 1920x1080. **Left 40%**: the phone on a wooden/matte desk, filmed from above-and-behind at ~45 degrees by a second phone on a tripod (4K/30, exposure and focus locked, no zoom). **Right 60%**: the dashboard case view recorded in the same take (OBS, 1080p60). **Bottom strip**: mono label + running timecode.
- Open full-frame on the phone for 3-4 s (shot 9) -> slide to split (shot 10). The slide is the only motion.
- **Burn in speaker-labeled captions** at the bottom of the left pane (Gibberlink did this and it carried 14M views). Source = the dashboard's real transcript events, not retyped.
- **Do not hide the latency.** The agent's ~1 s turn gap is real and shows it's live. Dashboard ASR partials will lag audio by a fraction of a second; leave it.
- Keep the phone on a folded towel so the vibration reads on camera without rattling the mic. Phone brightness 50%. Everything not the call: Do Not Disturb.

**Audio capture (three tracks):**
1. **Room mic**: a USB mic 20-30 cm from the phone speaker, Saketh in a separate quiet room, speakerphone on. This is the authentic "phone on a desk" track.
2. **Twilio dual-channel recording** of the call (clean agent leg + Acme leg), used as the transcript timing master and as a backup mix.
3. **Camera audio** for sync (clap at start).
Pick room mic as the mix if intelligible; otherwise mix the Twilio recording with a 300-3400 Hz band-pass and light room reverb, **and then do not use the word "unedited"** (see label).

**The honest label** (decide after you pick the take):
- If the picture and audio are one take with only ringing trimmed to <=3 s: `REAL CALL - NOT SCRIPTED - RINGING TRIMMED`.
- If untouched: `UNEDITED - REAL CALL - 1x`.
- If audio came from the Twilio recording: `REAL CALL - RECORDED VIA TWILIO`.
Never imply more than is true. A Ramp engineer will ask "was that cut?" and the label should already answer.

**Take log:** shoot 5-6 takes, write down each Twilio call SID and result. Use the best take; put "take 4 of 6" in the description. Saketh gets an improv card, not a script: "Say: 'No, we haven't changed banks.' Add ONE natural filler. If the agent asks to confirm, say 'Correct.' Don't repeat the agent's words. Don't speed up."

**Expected call (from 00-context; 01's script governs):**
AGENT: "Hi, this is the automated payments assistant for Rice Robotics. This call may be recorded. We received a request today to change Acme's bank account for payments. Did someone at Acme send that?"
ACME (Saketh): "Uh, no. No, we haven't changed banks."
AGENT: "Thanks. To confirm: Acme did not request a bank change?" ACME: "Correct."
AGENT: "Understood. We'll keep paying your existing account and flag that email as fraud. Goodbye."
Target wall-clock of the call: ~35-45 s; with ringing trimmed, shot 10 is ~54 s.

**Risk list for this one scene** (all must be rehearsed Tuesday morning): caller ID shows "Spam Likely" or "Scam Likely" on a fresh Twilio number (carrier analytics label; Twilio's guidance is SHAKEN/STIR registration in Trust Hub, matching CNAM, and checking from live handsets **[U: vendor/secondary sources]**: test from Saketh's actual carrier before the shoot, and if it shows "Spam", put a verified/caller-ID-named number in front, or use a number Saketh has saved as "Rice Robotics Payments" so the on-camera caller ID reads cleanly); voicemail picking up before Saketh answers (set a short ring timeout and have Saketh already holding the phone); agent talking over Saketh (01 must expose barge-in handling).

### 3.6 (e) Variants (V1 voicemail, V2 impostor who can't pass the challenge; plus V3 vague)

**V1: Voicemail -> UNVERIFIED -> human task (target 10 s of footage).** Saketh lets the phone ring out. Real carrier voicemail greeting plays; Twilio answering-machine detection fires; the agent hangs up **without leaving payment details** (01 decides if it leaves a generic callback request).
Visual sequence: phone rings out (LA) -> status chip `NO ANSWER - VOICEMAIL` -> `UNVERIFIED` -> a task card appears: `Call Acme manually - assigned: AP lead - bill held`. VO (Saketh): "Voicemail: held, and a human gets a task."
Why it works for engineers: it shows the default branch is the *safe* branch.

**V2: The impostor answers and fails the challenge (target 14 s).** Daniel plays a smooth scammer on a burner line routed as "Acme's number" (the demo vendor directory points at his phone).
AGENT: (same disclosure and question).
IMPOSTOR (Daniel): "Yes, yes, we changed banks last week, please use the new account, it's urgent."
AGENT: "Thanks. To confirm it's really Acme: what was the invoice number on your last paid bill?"
IMPOSTOR: "Uh... I don't have it in front of me, just send it to the new account."
AGENT: "I can't verify that. We're keeping the payment on hold and a person will follow up."
Chips: `CLAIMS CHANGE` -> `CHALLENGE FAILED` -> `HELD + ESCALATED`.
This is the single most compelling clip for the "what if a scammer answers" question. **Depends on 01 implementing a knowledge challenge (e.g. last paid invoice number or PO from Ramp data).** If that isn't built by Tuesday evening, drop V2 and say nothing about it. Do not fake it.
Key teaching line: a confirmation alone ("yes, we changed banks") never releases money.

**V3: "I think so?" -> UNCLEAR -> HELD (target 8 s).** Saketh gives a vague answer. Chip `UNCLEAR`, then `HELD`. No challenge asked. If time is short, V3 can reuse part of any take.

**Other cheap variants for the live final or Q&A (not for the video):**
- **Transfer/hold music:** Saketh says "let me transfer you", puts the phone on hold. Show timeout -> NO_ANSWER -> HELD.
- **Authenticated compromised mailbox:** the scam email comes from the vendor's *real* address, passes SPF/DKIM, sits in a real thread. Detection still triggers, because the check is on the *request*, not the sender. This is the answer to "why not just check email headers".

### 3.7 (f) The 45-60 s technical segment (3:02-3:57, 55 s)

The structure copies Greptile v5 (concrete worked example + diagram) and Ramp's Bill Pay Series (plain, specific). Everything on screen is *generated from the repo or the real run*.

1. **Architecture (9 s).** One diagram, thin outlines, mono labels, drawn on left-to-right: `INBOUND EMAIL (AgentMail webhook)` -> `DETECTOR (Claude, structured output)` -> `POLICY (pure function)` -> `RAMP /bills/{id}/hold` -> `VOICE AGENT (Twilio + realtime model)` -> `OUTCOME CLASSIFIER` -> `POLICY` -> `RELEASE | HOLD | HUMAN TASK`. **Labels reflect the default architecture in 00-context; 08 may change them. Update the Remotion JSON, not the voiceover.**
   Add the trust anchor visually: a mint padlock icon on `VENDOR DIRECTORY (number on file)`; a dashed red line from the email's number that *stops* before reaching the voice agent.
2. **Fail-closed policy (14 s).** Render the actual policy table from the repo (Remotion reads the policy file). Example rows (final rows come from 08/01):

   | Outcome | Action |
   |---|---|
   | CONFIRMED_NO_CHANGE | keep hold, flag email fraud |
   | CONFIRMED_CHANGE + CHALLENGE_PASSED | create human approval (release only after it) |
   | CONFIRMED_CHANGE + CHALLENGE_FAILED | keep hold, escalate |
   | UNCLEAR, NO_ANSWER, VOICEMAIL, TRANSFERRED, ERROR | keep hold, human task |
   | `*` anything else | keep hold, human task |

   Then show 6 lines of the TypeScript exhaustive switch with `never` so an unhandled outcome is a **compile error**. If the repo has a property-style test ("for every outcome not in the release set, action is HOLD"), flash its green result. **[CONFIRM WITH 08: whether a confirmed+challenge pass releases automatically or opens a human approval. Show exactly what is implemented. I recommend a human approval for a bank-account change, so the call is evidence, not authority.]**
3. **Ramp integration (10 s).** A terminal card with the real sandbox call. Verified from `raw/ramp_openapi.json` **[V]**: `POST /developer/v1/bills/{bill_id}/hold` ("Blocks all payments rails on a bill and deschedules payments"), `POST /developer/v1/bills/{bill_id}/release` ("Allows payments to be scheduled on a bill"), and vendor-scoped `POST /developer/v1/vendors/{vendor_id}/hold` with an optional `reason`. Also `GET /developer/v1/vendors/{vendor_id}/accounts?include_pending=true` ("also return bank accounts awaiting approval") - this maps directly onto "the scammer's account is the pending one". Sandbox base `https://demo-api.ramp.com` per 00-context. Show the 200 and the bill's `On hold` status in the Ramp UI. **03 owns whether to use bill hold or vendor hold; show whichever the code calls.**
4. **Detector eval (14 s).** One card: `N emails (n legit, n bank-change, n adversarial) / recall / false positives / median email-to-ringing time` and a **"known misses"** row with 2-3 actual failures (e.g., a bank change phrased only in a PDF). Honest small N beats a flashy number; Ramp engineers will read it as engineering maturity. **Numbers only from 02's reproducible eval script; if the script isn't done, show the *method* and the confusion matrix with the real N, never a fabricated percentage.**
5. **Decision-whys (inline, 6 s of chips).** The email says to "be ready to explain the decisions behind the tools": three 2-word mono chips on the diagram - `Twilio: owns the phone leg + recording`, `Claude: typed verdicts`, `code decides` - no extra VO.

### 3.8 (g) End card (3:57-4:12)

Static, restrained, same tokens as the product.
- Center: `CounterCall` wordmark (Anybody display), under it in mono: `stop paying scammers`.
- Bottom-left mono block: `github.com/<org>/countercall` and `countercall.<tld>` (live demo/landing, from 04).
- Bottom-right mono: `the nUbers - Eric, Daniel, Saketh` / `Technical build - BBS x Ramp Hackathon 2026`.
- Optional 1-line disclosure in small mono: `Fictional companies. Calls placed to consenting teammates. AI use: thumbnail art (gpt-image-2.5), everything else real.`
- Hold 3 s, one sustained low tone fading, hard cut to black. No "thank you", no QR code (the judges are watching a video, not a poster).

---

## 4. AI-generated media: where it earns its place, and when it doesn't

### 4.1 Rule (binding)

Use AI only when **all** are true: (a) it is a non-photoreal, non-human, **text-free** object or texture; (b) a judge would never ask "is this real?" about it; (c) it is composited under human-made type and used in <=2 shots plus the thumbnail; (d) it is disclosed in the README/description. **Never** use AI for: product UI, call audio, transcripts, API output, eval numbers, faces or bodies, any frame that contains text, narration, or anything we describe as "real" or "live".

If a teammate can say it, a teammate says it. If we can film it in 5 minutes, we film it.

### 4.2 Decisions

| Item | Decision | Reason |
|---|---|---|
| Veo / Kling / Runway b-roll | **No** | Floating-subject/hand tells; the teardown shows no great launch video here relies on it; time. Status [U]: Sora was discontinued (web/app 2026-04-26, API 2026-09-24; OpenAI Help Center article "What to know about the Sora discontinuation" is listed in search results **[V title/URL; I couldn't open the page body]**). Veo 3.1 preview model IDs reportedly retire 2026-10-22 and Kling 4.0 launched 2026-10-15 **[U: third-party blogs only]**. Not needed. |
| AI avatars / AI VO | **No** | Uncanny prosody; our own voices are the product's credibility |
| ElevenLabs | **Optional, live-final only**: clone *a consenting teammate's* voice for a 10-s Q&A insert "a cloned voice calls and says yes - we verify the line and a challenge, not a voice". Starter plan includes instant voice cloning + commercial license at $6/mo ($1 first month) **[V: elevenlabs.io/pricing, 2026-11-09]**. Needs on-screen "SYNTHETIC" label | Real teaching moment; **skip for Round 2** |
| Halftone cold-open still / hero art | **Yes (optional, one image)** | Matches the Greptile-like halftone motif the brief wants; shared with 04's landing page and the thumbnail |
| The halftone effect itself | **Do in code, not AI** | Deterministic, text-free, instant (script below, tested here) |

### 4.3 The one AI image (halftone handset)

Tool: **GPT Image 2.5 (Flare) on fal.ai**. Endpoint id `openai/gpt-image-2.5/flare/text-to-image` **[V: fal.ai model page, 2026-11-09]**. Price per image, output cost excl. prompt tokens ($5.00/1M input tokens): 1024x1024 **low $0.00588, medium $0.01317, high $0.05268, xhigh $0.09366, max $0.21072**; 1920x1072 high $0.03945; the page says `quality` defaults to `high` and `auto` can reach the max price, width/height are multiples of 16 (1920x1080 renders as 1920x1072). Free to try? Unknown; budget <$1 for the whole job. The input schema is only partly visible on the page (prompt, quality, num_images confirmed) **[U on exact size parameter name; open the model's API tab/OpenAPI before coding]**.

```ts
// npm i @fal-ai/client ; export FAL_KEY=...   (pattern from fal docs; verify field names on the model's API tab)
import { fal } from "@fal-ai/client";
const r = await fal.subscribe("openai/gpt-image-2.5/flare/text-to-image", {
  input: { prompt: PROMPT, quality: "medium", num_images: 4 } // add the size field the schema shows
});
console.log(r.data.images.map(i => i.url));
```

**Prompt 1 (hero handset, grayscale source for halftone):**
"Studio photograph of a single vintage desk telephone handset lying on a plain white sheet of paper, seen from above at a slight angle, one hard flash from the upper left, very high contrast, deep black shadows, bright white highlights, matte plastic, fine film grain, light grey seamless background with generous empty space around the object, centered. No text, no letters, no numbers, no logos, no people, no hands, no extra objects, no reflections of screens."

**Prompt 2 (alt, less cliche: handset + coiled cord forming a knot):**
"Black and white macro studio photograph of a coiled telephone cord tied into a loose knot, hard side light, extreme contrast, crisp edges, plain pale grey background, large negative space on the right. No text, no logos, no people, no hands."

**Prompt 3 (alt: empty chair in front of a desk phone, for the scammer-answers variant title card):**
"Black and white photograph of a landline desk phone on an empty wooden desk, a rolling chair pushed back, harsh single window light, very high contrast, grainy, lots of negative space. No text, no people, no screens, no logos."

Pick the best of 4; if hands or text sneak in, regenerate; do not retouch. Disclose in README/end card.

**Halftone it in code** (tested on this box with Pillow; swap to your tokens; output on a flat paper color):

```python
# pip install pillow ; python halftone.py in.png out.png 10 45 "#3D3B4F" "#E9E9E9" 2
import sys, math
from PIL import Image, ImageDraw, ImageOps
src, dst = sys.argv[1], sys.argv[2]
cell = int(sys.argv[3]) if len(sys.argv) > 3 else 10
angle = float(sys.argv[4]) if len(sys.argv) > 4 else 45
ink = sys.argv[5] if len(sys.argv) > 5 else "#3D3B4F"
paper = sys.argv[6] if len(sys.argv) > 6 else "#E9E9E9"
S = int(sys.argv[7]) if len(sys.argv) > 7 else 2
g = ImageOps.autocontrast(Image.open(src).convert("L"), cutoff=2)
W, H = g.size
out = Image.new("RGB", (W*S, H*S), paper); d = ImageDraw.Draw(out)
a = math.radians(angle); ca, sa = math.cos(a), math.sin(a)
R = int(math.hypot(W, H)/cell) + 2; px = g.load()
for i in range(-R, R):
    for j in range(-R, R):
        x = (i*ca - j*sa)*cell + W/2; y = (i*sa + j*ca)*cell + H/2
        if 0 <= x < W and 0 <= y < H:
            r = cell*0.72*math.sqrt(1 - px[int(x), int(y)]/255)
            if r > 0.4: d.ellipse([(x-r)*S, (y-r)*S, (x+r)*S, (y+r)*S], fill=ink)
out.resize((W, H), Image.LANCZOS).save(dst)
```

Use it twice: thumbnail art and a 1-2 s cold-open flash behind the wordmark (shot 5), and share the asset with 04 for the landing page. Animation: in Remotion, scale `cell` from 24 down to 8 over 12 frames (dots resolving) - a motif, not a gimmick.

---

## 5. Live-final talk plan (Thu Nov 19, evening, Ramp SF office)

**Assumptions (flag, not facts):** ~5 minutes on stage + Q&A (form and email only say "finalists present live in-person to Ramp engineers"; the form page I could read confirms in-person attendance on Nov 19 but not slot length **[V partial]**); a projector or large display; unknown mic/audio setup; unknown venue connectivity; judges seated close. Confirm slot length, audio/HDMI, wifi, and whether you may bring your own mic/hotspot as soon as Ramp responds.

### 5.1 Structure (5:00)

| Time | Beat | Speaker | Screen | Audience hears |
|---|---|---|---|---|
| 0:00-0:20 | Cold open: the email on the big screen, one line highlighted | Eric | Full-screen email | Eric, 3 sentences |
| 0:20-0:40 | The fix exists; scammers don't control the vendor's phone line | Saketh | Number-on-file vs number-in-email card | Saketh |
| 0:40-2:30 | **LIVE DEMO**: send the email; case builds; the call goes out; Acme answers; BLOCKED | Daniel drives, Eric narrates, Saketh plays Acme | Dashboard in presentation mode (large type, light theme) | Eric's narration + the real call audio from Saketh's phone at a mic; live transcript on screen |
| 2:30-3:00 | Fail-closed gallery: click through pre-recorded real cases (voicemail, vague, impostor) already in the DB | Saketh | Case list with 3 prior cases + outcomes | Saketh |
| 3:00-4:20 | Under the hood: architecture, policy source with `never`, Ramp hold/release on the sandbox, eval table | Daniel | 3-4 slides generated from the repo | Daniel |
| 4:20-4:45 | Why Ramp: bills + vendors endpoints it plugs into; what Ramp already does and what this adds (03's answer, rehearsed) | Eric | One slide | Eric |
| 4:45-5:00 | Close | all | End card | "The old way runs on someone remembering to make a phone call..." |

If the slot is **3 min**: cut the gallery and the Ramp slide; compress under-the-hood to 30 s. If **7-8 min**: add V2 (impostor) live as a second call and show the sandbox Ramp UI side by side.

### 5.2 Live-demo choreography

- **Roles:** Daniel = hands on the demo laptop (never speaks during the call); Eric = narrator (never touches the keyboard); Saketh = Acme, standing stage-left with a phone, holding it to a lavalier or a handheld mic on a stand, speakerphone ON.
- **What the audience sees:** projector = dashboard in presentation mode only (nav hidden, text >=125%, **light theme** since dark UIs wash out on projectors; 05 owns this). The live transcript is the subtitle for the phone audio.
- **What the audience hears:** the agent's voice from the phone speaker through the mic (lo-fi, authentic) + Saketh live. Do **not** route the laptop's call audio to the PA while the phone is also at a mic (feedback). A "listen-in" dashboard button that plays the call to the browser would be cleaner; it is a nice-to-have for 01/05, not a requirement.
- **Trigger:** Daniel clicks `send scam email` (pre-staged scenario button, 3 scenarios mapped to keys 1/2/3). Eric narrates what appears. Total live time target ~100 s.
- **Retry line (rehearsed; DispatchAI's first live call failed and they retried on stage and still took the Grand Prize):** Eric: "That's a real phone call, so sometimes the network has opinions. Daniel, run it again." Always have the **second** attempt reset (`pnpm demo:reset`, 2 seconds).
- **Honesty line at the start of the demo:** "Saketh is playing Acme. Everything else is live."

### 5.3 Fallback ladder (in order; announce each honestly)

1. **Primary:** real PSTN call to Saketh's cell over the venue's cellular signal.
2. **If call setup fails twice:** switch the Acme leg to a **second phone on a different carrier / personal hotspot** (carry two carriers; bring a hotspot + a spare charged phone).
3. **If PSTN is unusable in the room:** **"Acme softphone" web page** on Saketh's laptop (Twilio browser voice client; only needs internet). Same agent, same dashboard. Requires 01 to expose it. *Label it on stage: "this call goes over the internet instead of the phone network."*
4. **If the internet is down:** **offline fixture mode**: the dashboard replays a recorded real call (audio + timestamped transcript/event log) through the real UI at 1x, with pre-captured Ramp sandbox request/response. Say it plainly: "Network's down; this is the real run from Tuesday, same UI, same event log" and open the raw JSON. Requires `?replay=<case_id>` in the app (Hand-offs).
5. **Last resort:** play the Round-2 video from a USB stick (on two devices), skipping to 1:10.

### 5.4 Stage-risk checklist

Day-before and arrival:
- [ ] Arrive 45+ min early; **place a real test call from inside the room** on the same phone/carrier; look at the caller ID (spam labels?) and at the delay.
- [ ] Ask Ramp for: slot length, HDMI vs USB-C, mic type, wifi (captive portal? guest isolation?), whether you can run a hotspot.
- [ ] Demo machine: 1920x1080 output, mirror displays, scaling 100-125%, notifications and Slack off, **Do Not Disturb**, sleep/screensaver off, power cable, battery >80%.
- [ ] Hot spare: second laptop running the same build + the same fixtures, mirrored, signed in.
- [ ] Reset script verified (`demo:reset`), DB seeded with 3 prior cases, Twilio balance topped, API keys valid, Ramp sandbox token valid (not expiring tonight), webhook URL reachable from the venue network (no corporate proxy), rate limits checked.
- [ ] Slides/diagrams exported as PNG/PDF (not live links); fonts embedded; video copies on USB + laptop + phone.
- [ ] Caption: the transcript pane font >= 24 px; contrast checked on a projector (grey `#E9E9E9` bg + ink works; avoid pastel-on-white).
- [ ] Phone: ringer volume up, speakerphone default, **no voicemail greeting longer than 3 s**, "Acme" saved as the on-file number target.
- [ ] Rehearse **5 full timed run-throughs** (one with the network deliberately cut to test fallback 4, one with the phone declining to test voicemail).
- [ ] Water, backup mic batteries, a written copy of the 8 Q&A answers.

### 5.5 Q&A prep (answers are 1-2 sentences each; deeper answers belong to 01/03)

1. **"What if the vendor's phone is compromised?"** (below)
2. "Doesn't Ramp already do this?" -> 03's answer; our one-line version: "Ramp already flags and holds; CounterCall is the human-verification step Ramp leaves manual - we use their hold/release endpoints."
3. "Why not check SPF/DKIM?" -> compromised real mailboxes pass them; we verify the *request* through a separate channel.
4. "What stops the model from deciding to release?" -> it never can: the policy is a pure function with `default: HOLD`; model output is a typed enum.
5. "What about prompt injection in the email?" -> the detector's output is a typed verdict; the email body cannot cause a release; per 02/AgentMail "Agent Armor" if used.
6. "What if the number on file is wrong?" -> bank/phone changes to the trust anchor itself are the highest-risk event: we hold and require a human to change the number.
7. "Latency and cost per call?" -> numbers from 01's measured run only.
8. "Why Claude + realtime voice model?" -> typed verdicts vs low-latency turn-taking; swappable.
9. "Prior art?" -> "Yes: a SteelHacks project (Trouvé/callback) built the same loop with a seeded inbox; ours is a live realtime agent on a real phone line with a fail-closed policy and Ramp's API."

**The compromised-phone answer (60 s script):**
"Then the callback control is defeated, and we say so: every callback procedure has that failure mode. Three things shrink the damage. First, the call alone never moves money: a confirmation is evidence, and above a threshold it opens a human approval. Second, the agent asks a question only the real vendor can answer, like the last paid invoice number from Ramp's own data, so an attacker who only owns the phone line still fails unless they also own the books. Third, changing the number on file is itself a held, human-approved event with a cooling-off period, so an attacker can't talk the system into trusting their number in the first place. The right comparison is today, where an attacker needs only an email." **[CONFIRM WITH 01/08 that each of the three is actually implemented; say only what is built, and label the rest "roadmap".]**

---

## 6. Packaging

### 6.1 Upload

- **Unknown:** whether the form wants a link or an upload (the Google Form's later pages were not visible to me; only page 1 of 5: email, deadline Nov 10 11:59 PM PT, one application per team, finalists must present in person Nov 19 **[V]**). Prepare **both**: an **unlisted YouTube** link and an **MP4 on Drive with "anyone with the link"**, plus the GitHub repo. Export H.264, 1920x1080, 30 fps, AAC 48 kHz, ~-14 LUFS integrated, <=300 MB; upload a **.srt** (accessibility, plus it helps a judge skim).
- **Title (<=95 chars):** `CounterCall: an AI that phones your vendor before you wire the money | BBS x Ramp Hackathon`
- **Thumbnail concept (1280x720), choose A:**
  A. Cream `#E9E9E9` field, halftone handset (4.3) left third, right two-thirds in huge Anybody: `DID YOU SEND THIS?` (<=4 words, readable at 168x94), small mono label `COUNTERCALL` top-left, a rotated (-4 degrees) mint stamp `BLOCKED $24,800.00`.
  B. (hero still for README/Devpost) split frame: real phone ringing on desk, right a real transcript line `No, we haven't changed banks.` with a red `BLOCKED` chip.
  Rules: no faces, no gradient glows, no emoji.
- **Description (paste-ready):**

```
CounterCall automates the oldest fix for vendor-bank-change fraud: call the vendor back on the number you already have.

When a vendor email asks to change bank details, CounterCall catches it, puts the bill on hold through Ramp's API, calls the vendor's number on file with an AI voice agent, and decides with deterministic policy code, never the model. Any unclear answer, voicemail or failed challenge keeps the payment held and creates a human task.

0:00 The scam and the old fix
0:34 CounterCall
0:38 Live: email in, bill held, call placed
1:10 The real call (not scripted; Saketh plays Acme)
2:12 Result: held, flagged, audit log, Ramp bill on hold
2:32 Voicemail, vague answers, impostors: all fail closed
3:02 Under the hood: architecture, policy, Ramp API, detector eval
3:57 Close

What is real: the email processing, the Ramp sandbox hold/release calls, the Twilio call, the transcript and the dashboard. What is simulated: Rice Robotics (customer) and Acme Industrial Supply (vendor) are fictional; teammates played the people being called. Every call went to a teammate who consented, and the agent says it is automated at the start of each call.
AI use: thumbnail art (gpt-image-2.5), the voices and script are ours.

Code: <GitHub URL>   Live demo/landing: <URL>
Team: the nUbers (Eric, Daniel, Saketh) - BBS x Ramp Hackathon "Automate the Old Way", technical build track.
```

(Chapter timestamps must be updated to the final cut.)

### 6.2 Names

- **Product name: keep "CounterCall."** A quick web search (WebSearch, access 2026-11-09, not exhaustive) found no product or startup named CounterCall; it is pronounceable, reads as "counter" (as in counterparty/countermeasure) + "call", and is easy for a phone ASR/TTS to say. **"Callback" is a bad rename:** it is a generic word (unsearchable), there is a same-concept hackathon repo literally named `callback` (Connor-W-Cahill/callback, "Trouvé", SteelHacks XIII, README says: Nemotron + ElevenLabs + Twilio optional + seeded inbox) and a commercial product CallbackProof (documentation/workflow tool, explicitly "not a fraud-prevention service") **[V: github.com/Connor-W-Cahill/callback; callbackproof.com via search]**.
- **Fictional names:** keep **Rice Robotics** (customer, plausible AP buyer for $24,800 industrial supplies) and **Acme** (vendor), because the Round-1 video already used them and "Acme" is one easy word for live phone transcription. On screen, always show the full name `Acme Industrial Supply` and a footer `All companies fictional`. Don't use a real company's domain for the lookalike or the vendor mailbox: use a domain the team controls or the demo mail provider's default domain.
- **Realism upgrade:** the cold-open email should come from the vendor's *real-looking, correctly-authenticated* address in a real thread (simulated compromised mailbox), not a crude lookalike; that is the harder, more truthful case and makes the call the only thing that catches it.

### 6.3 Production schedule for Tuesday (time-boxed; 06 owns tooling)

| Time (PT) | Task |
|---|---|
| Mon night | Record VO drafts for A, D, G from the script (fine to re-record); gather B-roll: phone ring (LA) and team wide shot |
| Tue 9:00-11:00 | Freeze the demo flow; seed fixtures; rehearse the hero call twice |
| Tue 11:00-14:00 | **Shoot hero take (5-6 takes) + V1/V2/V3** (needs the call path working; if not by 14:00 use the fallback in 3.5: another real take with a manually-triggered call, never a mock) |
| Tue 14:00-18:00 | Edit A, B, C, D, E; build Remotion cards; assemble tech segment with real numbers (needs 02's eval by ~16:00) |
| Tue 18:00-20:30 | Record F's VO with final numbers, mix, burned-in captions, QC on a phone speaker and on laptop speakers |
| Tue 20:30-22:30 | Export, upload (unlisted YouTube + Drive), write description, verify the link in a private window |
| Tue 22:30-23:00 | Submit the form (hold a >=60 min buffer before 23:59) |

Cut lines if time slips: **Tier 0 (must):** A + B + C + D + G with the tech segment as static slides from the repo. **Tier 1:** animated architecture/policy/eval Remotion cards. **Tier 2:** E variants. Never cut C.

---

## 7. Hand-offs

### 7.1 To the app/design agents (04, 05) and architecture (08): assets and demo-mode features my storyboard needs

Screens and states (each needs a camera-ready, frame-stable state):
1. **Inbox/queue** with the incoming scam email appearing live (no page refresh); a visible **clock** (`00:03`) anchored to the moment the email was sent.
2. **Case view states:** `DETECTED` (signals listed with reasons), `HELD` (with the **Ramp API call chip** `POST /bills/{id}/hold 200`), `CALLING` (ring timer), `IN CALL` (live transcript, speaker labels, partial words), outcome chips `CONFIRMED_NO_CHANGE`, `UNCLEAR`, `NO_ANSWER/VOICEMAIL`, `CHALLENGE_FAILED`, then `BLOCKED/HELD`, `TASK CREATED` (assignee, SLA).
3. **Trusted-number panel:** number on file (with "added 2026-03-14") next to the number found in the email (flagged `ignored`).
4. **Evidence pack:** detection signals (bank-change phrase, account number differs from file, urgency, thread context); optional header results.
5. **Audit log** with timestamps, transcript, call SID, policy rule that fired.
6. **Raw event/API drawer** (toggle with a key): Ramp request/response JSON, Twilio call SID, policy decision, in mono. (Used in shot 20 and live-final fallback 4.)
7. **Policy view (read-only):** the actual deterministic policy rendered from `policy.ts`, matched rule highlighted. Remotion can import the same file.
8. **Eval page/export:** `pnpm eval` prints N, recall, FP, median email-to-ring time, and the list of misses; also writes `eval.json` for Remotion.
9. **Presentation mode:** hides nav, 125% type, **light theme default** for projector legibility, cursor highlight on click (small ring), no toasts.
10. **Demo-mode features:** `demo:reset` (2 s), scenario keys 1/2/3 (bank change; compromised-mailbox authenticated; benign invoice), `?replay=<case_id>` (replays recorded events + audio at 1x for offline fixture mode), three seeded prior cases (voicemail, vague, impostor) with real transcripts.
11. **Ramp sandbox seed:** vendor Acme Industrial Supply with bank on file, bill INV-4471 `$24,800.00` due Fri (visible both in our UI and, if sandbox access arrives, the Ramp UI). If sandbox access is not granted before Tuesday 11:00, say so on screen and use our own bill view; do not mock Ramp's UI to look like Ramp's.
12. **Acme softphone web page** (Twilio browser voice client) and an optional **listen-in** button, for live-final fallbacks (01/05).
13. **Brand tokens** as JSON/CSS: fonts, colors, border (0 radius, dashed hairline), status-chip styles, so Remotion matches exactly. A wordmark SVG, a halftone handset PNG (from 4.3), favicon/logo-mark.
14. **Consent/disclosure copy** surfaced in UI: "This call is placed by an automated assistant."

### 7.2 To 06 (video pipeline)

- **Capture:** screen at 1920x1080 or 2560x1440 @60 fps (OBS), a second phone on a tripod for the hero (4K/30, locked exposure/focus), USB mic for the room track, Twilio dual-channel recording for the clean track, a clap sync mark, a written take log with call SIDs.
- **Delivery:** 1920x1080, 30 fps, H.264, AAC 48 kHz, -14 LUFS, +/-1 dB; burned-in captions on the hero pane only; separate .srt for the whole video.
- **Remotion scope (graphics only):** stat cards (shot 3), number-vs-number card (shot 4), wordmark + halftone resolve (shot 5), architecture draw-on (17), policy table from real file (18/19), terminal card from real log (20), eval card from `eval.json` (21), 3-up grid (14), end card (24), lower-third/status chips. **No spring/bounce; two easings only.**
- **Compositing:** split-screen hero from two video sources with a synced timecode; burned-in speaker captions from the dashboard's own event log (not retyped); audio: no music under C, no whooshes.
- **VO:** record each paragraph twice; no AI denoise; room tone bed under silent gaps.
- **Dependency order:** hero take -> everything else; eval numbers (02) -> shot 21; policy/architecture finalized (08) -> shots 17-19; Ramp sandbox capture (03/08) -> shots 13, 20.

### 7.3 To other research lanes

- **01 (voice):** (i) disclose "automated" + "may be recorded" in the first sentence; (ii) answering-machine detection and "do not leave payment details" behavior; (iii) barge-in so the agent doesn't talk over Saketh; (iv) a **knowledge challenge** (last paid invoice number from Ramp data) and a `CHALLENGE_FAILED` outcome, or V2 is dropped; (v) caller-ID reputation test from a real handset (spam-label risk on a fresh Twilio number); (vi) the Acme softphone path.
- **03 (problem fit/Ramp):** confirm the two stats exactly as I speak them; **name the SteelHacks `callback` prior art and write the "what's different" answer** (live realtime agent on a real phone line + fail-closed policy + Ramp API); decide bill hold vs vendor hold; whether `include_pending` accounts can represent the scammer's account.
- **02 (detection):** reproducible `pnpm eval` with honest N and a "known misses" list; a scenario where the scam email comes from the vendor's real, authenticated address.
- **08 (architecture):** confirm the final node labels for the diagram; confirm what releases money (I recommend: a confirmed call + passed challenge opens a **human approval**, it does not auto-release).

---

## 8. Sources and access log (all accessed 2026-11-09)

Primary/inspected:
- YouTube metadata, chapters, auto-captions, storyboard thumbnails via yt-dlp (version 2026.10.26): ids listed in 1.2. Contact sheets: `/home/user/countercall/research/design/video-refs/`.
- DispatchAI description (hackathon result): https://www.youtube.com/watch?v=hdpdgxrilQM
- Gibberlink description (hackathon result): https://www.youtube.com/watch?v=EtNagNezo8w
- Ramp Developer API (hold/release text): `/home/user/countercall/research/raw/ramp_openapi.json`
- ElevenLabs pricing: https://elevenlabs.io/pricing
- fal.ai model page: https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image
- Prior-art repo: https://github.com/Connor-W-Cahill/callback
- Hackathon form page 1 (deadline/live-final text): https://forms.gle/FxUVTm6Z75f121ov5

Secondary/unverified [U]:
- Sora discontinuation: https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation (search result; body not opened)
- AI-video tells (vendor blogs): https://salesaicourse.com/why-ai-video-looks-fake/ , https://echonos.ai/blog/ai-video-looks-fake , https://resource.digen.ai/why-ai-video-voices-sound-unnatural-2026-fix/
- Launch-video write-ups: https://hound-studio.com/blog/22-best-product-launch-videos-2026-examples-formulas , https://www.arcade.software/post/product-launch-video-examples
- Veo/Kling status: https://modelslab.com/blog/api/veo-3-1-vs-kling-3-sora-2-ai-video-api-cost-2026 and similar (all third-party)
- Twilio spam-label guidance (vendor/secondary): https://aloware.com/blog/avoid-being-flagged-scam-likely
- CallbackProof: https://callbackproof.com/

Things I did NOT do or could not verify: hear any audio; see any frame above 160x90; confirm Ramp's slot length, venue audio/network, or the Round-2 form's video field type; confirm any detector/eval/latency numbers (they don't exist yet; all `[N]`, `[a of b]` placeholders in the script must be filled from 02's run).
