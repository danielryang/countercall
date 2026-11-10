# 06 — Demo-video pipeline (tools, pipeline, recipes, costs)

Agent 06. Written 2026-11-09. All "verified" items were checked today; sources and access dates are in the ledger at the bottom. Agent 07 owns WHAT is shown. This file owns HOW it gets made.

## 0. Decisions at a glance

| Question | Decision | Fallback |
|---|---|---|
| Screen capture (real app, live call) | **Screen Studio 4** (Mac only, $29 for one month, student 40% off) | **Cap** Studio Mode (free for personal use), then raw QuickTime/OBS plus our own `ScreenClip` camera keys in Remotion |
| Re-recordable / deterministic app shots | **Playwright 1.64 `page.screencast`** plus an events JSON that Remotion turns into zooms. This is a **Nov 19 / stretch** item, not the Nov 10 critical path. | Re-record with Screen Studio |
| Motion graphics and final assembly | **Remotion 4.0.539** in `/video`, reusing the app's presentational React components. Free for us (individuals / up to 3 people). | DaVinci Resolve 21 (free) assembling Remotion scene MP4s |
| VO, audio edit and captions source | Real team voice, recorded in a closet. **Descript** (free tier) for cleanup, transcript and SRT. ffmpeg does the master mix and loudnorm. | ElevenLabs `eleven_v4` / `eleven_multilingual_v2` on Starter ($1 first month, then $6) |
| Music | **Uppbeat free tier** (credit line in description) or **ElevenLabs Music v2.5** on Starter | Avoid Suno (see section 4) |
| Phone SFX | Synthesize ringback and dial tone with ffmpeg (zero licensing). Record a real phone ringing. | Freesound CC0 |
| Export | **1080p30 H.264, BT.709, AAC 320k, -14 LUFS / -1 dBTP**, plus a smaller upload copy | 4K re-render only after the Nov 10 submission is safe |
| Hosting | **YouTube Unlisted** (primary) plus **Drive "Anyone with the link"** MP4 copy | Vimeo only if both fail. Loom free (5 min, 720p, no download) is out. |
| Cost, one month | **$0 minimum, about $30-40 recommended** (Screen Studio month, optional ElevenLabs Starter) | |

Core stance: **audio-first**. Lock the script and VO, then derive every scene length from the VO markers. Remotion renders picture only (`--muted`). ffmpeg builds the master audio, runs two-pass loudnorm, and muxes. The whole thing is code in git, so Claude Code can edit it and it can be re-rendered on Nov 19.

---

## 1. Local skills: what's usable

Read from `/home/user/.claude/plugins/cache/ecc/ecc/2.2.2/skills/`.

| Skill | Verdict | Notes / corrections |
|---|---|---|
| `remotion-video-creation` (+ `rules/*.md`) | **Use.** Best fit. | Rules for audio, captions, transitions, tailwind, text-animations, videos are good. **Corrections vs Remotion 4.0.539:** (a) `videos.md` says `trimBefore` is "in seconds" but the code and the real API use **frames**. (b) `<Video trimAfter>` is **deprecated**; use `durationInFrames` (checked in the 4.0.539 type defs and the docs page). (c) The skill never mentions `visualizeAudio` or `useWindowedAudioData`; see section 2.4. |
| `ui-demo` | **Partly.** Reuse the cursor-overlay, rehearse-then-record and `moveAndClick` ideas. Do not use its settings as-is. | It records via `recordVideo` at **1280x720**, old default VP8/25fps, and its mouse moves are linear `steps:10`, which looks robotic. Playwright 1.64 now has `page.screencast` with `fps:60` and VP9; see section 1.1. Its three-phase "Discover, Rehearse, Record" is exactly right for the Nov 19 re-record. |
| `video-editing` | **Partly.** The ffmpeg cut/concat/proxy snippets and the "FFmpeg is the backbone" stance are fine. | Its loudnorm example is **I=-16:TP=-1.5**. Our target is **-14 / -1**. Its ElevenLabs example uses `eleven_turbo_v2_5`, which is **deprecated** (ElevenLabs docs, 2026-11-09). |
| `fal-ai-media` | **Skip.** | Generative video and images are the "looks AI" trap. Same deprecated ElevenLabs model id. |
| `tasteforge-video` | **Skip.** | Offline style-pack and EDL planning; hard-locked to "no provider generation". Overkill for a 4-minute screen-based demo. |
| `videodb` | **Skip.** | Cloud upload, indexing and API key. Nothing we need. |
| `manim-video` | **Skip.** | Needs a second toolchain (Python, Cairo, LaTeX-ish deps) on three Macs. Remotion does the architecture diagram in the same stack (section 2.3). |

### 1.1 Playwright capture: what I tested (Linux sandbox, Playwright 1.64.1, Chromium)

| Test | Result |
|---|---|
| `page.screencast.start({path, size:{2880,1800}, fps:60})`, viewport 1440x900, `deviceScaleFactor:2` | Output container is 2880x1800, **VP9, 60 fps** (about 60 packets/s), but the content is **only 1440x900 in the top-left**, with gray padding on the right and bottom. **DSF 2 does not give a 2x video.** |
| Same, using `onFrame` JPEG callbacks | Frames are **1440x900** (not 2x), about 60 fps. Same limit. |
| Viewport = output size: 1920x1080, DSF 1, `size` 1920x1080 | Clean full frame, VP9, 60 fps. **This is the reliable path.** |
| Viewport 2880x1800 plus `document.documentElement.style.zoom=2` | Fills 2880x1800 with no padding, but `innerWidth` reports 2880, so Tailwind breakpoints see 2880. |
| Bitrate | Only 0.3-0.4 Mbps on a trivial scene. I did not test a text-dense animated UI; **check for softness before trusting it.** |

Playwright facts from the docs: default `fps` is 25, and Firefox/WebKit cap at 25. Chromium is fine. 1.64 added `fps`, `showActions({cursor,style})` and VP9 as the default codec. It captures page content only: no OS cursor, no browser chrome, no native dialogs, no popups. That is why Screen Studio's auto-zoom (which needs the real OS cursor) cannot ride on Playwright. For Playwright footage, the zoom comes from Remotion camera keys (section 6.5).

---

## 2. Tool decisions

### 2.1 Screen capture

| Tool | Price (today) | Verdict |
|---|---|---|
| **Screen Studio 4** (released 2026-10-02) | $29/mo, or $9/mo billed yearly ($108 upfront). Students/educators 40% off. No lifetime. macOS 13.1+ only. Export up to 4K60. | **Primary.** Auto-zoom on clicks, cursor smoothing, click ripple, transcript editing, mic noise reduction. All three of us are on Macs. **There is no watermarked trial; export is blocked until you pay.** Buy the monthly plan tonight, on one Mac, and have one person record. |
| **Cap** (v0.6.2, 2026-10-28) | Free for personal use, no time limit on local recordings. Studio Mode and 4K60 export on the free plan. Pro $12/user/mo. Repo is AGPLv3. | **Fallback.** Studio Mode has backgrounds, zooms, trim, captions. Reviewers (competitor blogs, treat with caution) say click-zoom and cursor smoothing exist but easing is a notch below Screen Studio. |
| FocuSee | $19.99/mo or $49.99/yr (Standard); trial exports are watermarked | Skip. |
| Tella | $13/user/mo annual, $26 monthly; 7-day trial; no free plan | Skip (cloud-first, per seat). |
| Loom | Free: 5-min cap, 720p, 25 videos, no download | **No.** |
| OBS 33.0.1 (2026-10-29) | Free | Last resort for raw capture. Pair with Remotion `ScreenClip` camera keys. |
| QuickTime | Built in | Also the way to record the **iPhone screen over USB** for the incoming-call shot. |

**Rule per shot:**
- **Path A (default, about 80% of shots):** Screen Studio does the zoom and cursor. Export **1080p60**, no background, as a finished clip, and drop it into Remotion as a full-bleed `<Video>`.
- **Path B (shots that need overlays or exact control):** Export the **native/4K raw window, no zoom**, and zoom in Remotion with `ScreenClip` camera keys.
- Record the **window, not the screen**, at a fixed 1440x900 on a Retina Mac (native 2880x1800).
- Set macOS Do Not Disturb. Use a clean Chrome profile with no extensions and the bookmarks bar hidden.
- Screen recordings are variable-frame-rate. Normalize before Remotion if anything stutters (see 6.6 recipe `cfr`).

### 2.2 Composition: Remotion

- **Version:** `remotion@4.0.539` (npm, 2026-11-09). All `@remotion/*` packages must be the **same pinned version**.
- **License (verified from `LICENSE.md` in the npm package and the GitHub raw file):** free if you are *"an individual"*, *"a for-profit organization with up to 3 employees"*, a non-profit, or evaluating. Company License is needed above that. The FAQ counts total headcount, and contractors aggregate toward the 4-person threshold. The FAQ does **not** address students, interns, hackathons or employees' side projects. Our case: three students building a personal hackathon entry. That is an individual/up-to-3 use. **Use personal laptops and accounts, not employer hardware or an employer org.** If anyone is unsure, email hi@remotion.dev.
  - Paid fallback: Creators $25/seat/mo; Automators $0.01/render with a $100/mo minimum.
  - Remotion 5.0 changes the license (contractors count toward team size; terms-and-conditions bound). We pin 4.0.539, so this does not affect us now.
- **Not recommended for this window:**
  - **Motion Canvas** (MIT, 19.7k stars, last npm release v3.17.2 in Dec 2024, last push 2026-07-02): own scene-graph runtime, cannot reuse our React components.
  - **Revideo** (MIT, 4.2k stars, last push 2026-07-15): same problem.
  - **Jitter**: free is 720p30 with a watermark.
  - **Rive**: free tier limited; third-party pricing sources conflict.
  - **After Effects**: about $22.99/mo (third-party price); the team has no AE skills.

### 2.3 How to do the five required things in Remotion (all verified by rendering, Remotion 4.0.539, Linux)

1. **Composite real recordings:** `<Video src={staticFile('takes/x.mp4')} muted />` from `@remotion/media`. `trimBefore` is in frames; use `durationInFrames`, not `trimAfter`. Camera zoom, click ripples and tilt are in `ScreenClip.tsx` (6.5). ProRes needs a special decoder flag; use H.264 MP4.
2. **Reuse the app's own React components:** verified with a Tailwind v4 component living in a sibling `web/` folder, imported through an `@/` alias, animated by Remotion's frame. Rules in 6.4.
3. **Kinetic typography:** `KineticLine` (masked word rise, staggered `spring`, `damping:200` = no bounce) and `CountUp`. Rendered with Anybody 800.
4. **Animated architecture diagram:** `ArchDiagram` uses dashed-border boxes (brutalist), `evolvePath` from `@remotion/paths` for line draw-on, and a mint "packet" moving along each edge with `getPointAtLength`. Rendered correctly. The 3rd edge is a straight diagonal; switch to elbow paths if it bugs you.
5. **Call audio as waveform:** `@remotion/media-utils` is MIT. `useWindowedAudioData` (docs: **WAV only**) plus either `visualizeAudio` (spectrum bars; `numberOfSamples` must be a power of two; returns values 0-1) or `visualizeAudioWaveform` (time-domain line) plus `createSmoothSvgPath`. Both rendered. **Speech is quiet; use the `gain` prop** (my tone test came out nearly flat at gain 1).

Other Remotion gotchas I hit:
- **Default H.264 output is tagged `yuvj420p` / `bt470bg`.** That can shift brand colors. Always pass `--color-space=bt709`. Verified output: `yuv420p`, `tv`, `bt709`.
- **`--scale=2` on a 1920x1080 composition gives 3840x2160.** UI and text are re-rasterized crisp; embedded video is only as sharp as its source.
- **`__dirname` inside `remotion.config.ts` resolves to the Remotion CLI's folder**, not your project. Use `process.cwd()`. This broke my first alias attempt.
- **First render downloads Chrome Headless Shell.** Run `npx remotion browser ensure` while you have network. **Google Fonts load over the network at render time** (they worked here). Self-host the three font files if the venue Wi-Fi is bad.

### 2.4 Finishing tools

| Tool | Price | Verdict |
|---|---|---|
| **Remotion** | free | Final assembler (picture). |
| **Descript** | Free: 60 media-min/mo, 720p export, limited Studio Sound. Hobbyist $16-24/mo, Creator $24-35/mo (annual/monthly; page didn't label which). | Use for **VO cleanup, transcript, SRT export**. Export audio WAV, not video, so the 720p limit doesn't matter. |
| **DaVinci Resolve 21** | Free; Studio $236. Free handles UHD up to 60 fps (8-bit). | **Fallback finisher** if Remotion assembly fights you: import scene MP4s, Fairlight for audio, color. |
| Final Cut Pro | $299.99 once, or Apple Creator Studio $12.99/mo with a 30-day trial. Needs macOS 15.6+. | Not needed. |
| CapCut | Free / Pro $19.99/mo (export limits not stated on the page) | Panic option for captions only. |

- **Captions:** the same `.srt` file feeds both the YouTube caption track and the Remotion `Captions` component (6.5). Brand style: Space Mono, uppercase, hard ink box, no rounded corners. ffmpeg burn-in (6.6) is the fallback.
- **Color pass:** do **not** grade UI or graphics; keep brand hex exact. Grade only real camera footage (the phone-ringing shot): match exposure, `eq=contrast=1.05:saturation=0.95`. Then add a very subtle grain over the whole picture (`noise=alls=6:allf=t` or an SVG feTurbulence at 2-3% opacity). It unifies screen-cap and graphics and kills the "too clean, generated" look.
- **3D tilt / device frames, tastefully:** `TiltIn` enters at about 10 degrees, settles flat, hard offset shadow (no glow, no glass). Once per hero shot, never a looping float. No iPhone mockups for a web app. For the phone shot use real footage.

---

## 3. Capture: the real call

1. Make the call to a team-owned phone, with a consenting teammate playing the vendor. The agent must disclose automation and recording at the start (agent 01 owns the legal wording). Show an on-screen "AI voice agent" label.
2. **Twilio recording:**
   - Set `RecordingChannels=dual` when creating the recording.
   - Download with `?RequestedChannels=2` (docs: retry with `RequestedChannels=1` if it 400s).
   - Docs state WAV is 128 kbps and MP3 is 32 kbps; they do **not** state the sample rate. Expect **8 kHz telephone-band** audio. You cannot restore what isn't there; make it a feature (waveform plus captions).
   - **Twilio does not document which channel is which party.** Test it (6.6 `call-clean.sh` prints per-channel RMS), and listen.
3. **Record three things at once:** the dashboard (Screen Studio), the Twilio call (server-side), and the real phone ringing (QuickTime iPhone USB capture, or a second phone on a desk). Start all three with a visible/audible sync mark.
4. Have agent 01 log **call event timestamps** (answered, first utterance, transcript lines with ms offsets). The Remotion call scene can then replay the real transcript in sync with the real audio.
5. **Do not run Descript Studio Sound or Adobe Enhance on the call audio.** It would invent clarity and undercut "this is a real call." Light ffmpeg cleanup only (6.6).
6. Plan **one hero take plus 2-3 retakes**. A live call is non-deterministic and each retake costs real time.

---

## 4. Audio

**Voice-over (team's own voice, primary)**
- Quiet closet full of clothes, or a duvet over your head and phone. A bare room's reverb is the number-one amateur giveaway.
- **iPhone Voice Memos** set to *Lossless*, mouth 15-20 cm away and slightly off-axis. Or the MacBook mic at about 30 cm in the same closet. **No Bluetooth or AirPods mics** (narrowband codec).
- Turn off fans and AC. Record 10 s of room tone first. Do 2-3 takes per paragraph. Read at about 150 wpm, standing and smiling.
- Convert: `ffmpeg -i vo.m4a -ar 48000 -c:a pcm_s24le vo.wav`.
- **Cleanup:** `highpass=f=80`, then **either** Descript Studio Sound **or** Adobe Podcast Enhance. **Never stack them** (the common cause of metallic or watery voices in the 2026 comparisons). Keep Studio Sound at roughly 50-70% intensity (Descript offers 1-100%; value is a guess, trust your ears). Adobe free: files up to 30 min / 500 MB, about 1 h per day, no strength control, and its default strength reads artificial on clean audio. Adobe's premium sold via Firefly Pro at $19.99/mo (conflicting sources).
- One narrator for consistency. Pick the best voice, not the producer.

**ElevenLabs (fallback only)**
- Models (official docs, 2026-11-09): `eleven_v4` is "most emotive, high quality" (10k-char limit). `eleven_multilingual_v2` is the most stable for long-form, previous-gen. `eleven_flash_v2_5` is fast and cheap. **`eleven_turbo_v2_5` is deprecated**, and the local skills still reference it.
- Docs facts: speed 0.7-1.2 (extremes degrade quality). **No `<break>` tags on v3/v4**; control pauses with punctuation (v4 is very punctuation-sensitive) and audio tags. v4 understands IPA wrapped in slashes.
- Least-AI recipe (conventional practice, not doc-verified): pick a natural, non-announcer voice. Lower Stability (about 0.3-0.5) so it isn't monotone. Keep Style near 0. Speed 0.95-1.0. Generate **per sentence**, pick the best takes, and add the same room tone as the human VO. Never generate the whole script in one pass.
- Plans: Free 10k credits (no commercial license). Starter $1 first month, then $6/mo: 30k credits, commercial license. Creator $11 first month, then $22/mo.

**Music**

| Option | Cost | Licensing for a public submission |
|---|---|---|
| **Uppbeat free** | $0 | Free tier requires the credit line, own-channel use, excludes paid ads and client work; download caps are tiny. **I could not load the official page (429); verify terms before relying on this.** |
| **ElevenLabs Music v2.5** (`music_v2_5`) | Starter $6/mo ($1 first month); about 900 credits/min | Starter lists "Music commercial use". Note `music_v1` is removed 2027-01-31. |
| Epidemic Sound | about $9.99/mo billed yearly (third-party; conflicting) | Whitelisting helps with YouTube claims. Monthly pricing is probably higher; unverified. |
| Artlist | $199/yr, annual only (March 2026 source) | Skip: no monthly plan. |
| Musicbed | Per-project sync licensing, not priced here | Skip: unverified, not hackathon-shaped. |
| **Suno** | Free tier non-commercial only; Pro/Premier grant commercial rights (terms changed 2026-09-03 to "downloaded while subscribed" per secondary sources) | **Avoid.** No indemnity; AI-only output may not be copyrightable; UMG and Sony filed a second suit in Sept 2026 covering v6. Do not put this in front of a sponsor. |

Pick one sparse, instrumental track, low-key (minimal electronic or ambient). Mix it about 20 dB under VO and duck it (6.6 `mix.sh`). **Content-ID risk:** a claim on the YouTube copy can mute or block it. Upload early, check the YouTube Studio copyright check, and always keep the Drive MP4 as the second link. Keep a screenshot of the license.

**SFX**
- **Ringback (US):** 440+480 Hz, 2 s on / 4 s off. **Dial tone:** 350+440 Hz. Both generated with ffmpeg (tested), so there is zero licensing risk (6.6 `sfx.sh`). The tone plan is from standards knowledge, not re-verified online; confirm by ear.
- **Real phone ring:** record your own phone ringing. Cleanest licensing and most authentic.
- UI ticks: a 30 ms sine blip (`tick.wav`, in `sfx.sh`) at about -30 dB under VO. Keep SFX rare.

**Loudness:** integrated **-14 LUFS**, true peak **-1 dBTP**, via two-pass loudnorm (6.6). **Accuracy is about plus or minus 0.5 LU.** My synthetic test landed at -13.7 LUFS, and a second tone test at -14.0. Always verify with `ebur128` and re-run with an adjusted `I` if off. The call stem is pre-normalized to about -16 LUFS so it sits next to the narration.

---

## 5. Export and delivery

- **Master:** **1080p30 H.264 High, yuv420p, BT.709 (tv), AAC-LC 320 kbps 48 kHz stereo, `+faststart`.** YouTube's own spec table: 1080p30 SDR is 8 Mbps, 1080p60 is 12 Mbps, 4K30 is 35-45 Mbps. Audio AAC stereo 384 kbps; BT.709 for all color fields; no RGB matrices.
- **Why 1080p30:** a 4-minute 4K render is about 4x the pixels of an already uncertain render. Render time on Macs is **not measured** by me (sandbox: 120 frames of 1080p with video and audio took about 20 s on a 96-core Linux box, not representative). Rough planning number for an M-series laptop, an **estimate**: 5-15 fps for UI scenes with embedded video, so 7,980 frames take about 10-40 minutes. 4K (`--scale=2`) would be 4x that. **Do 4K only after the Nov 10 submission is safe**, for the Nov 19 deck.
- **30 vs 60 fps:** 30. Screen Studio exports 60; Remotion pulls frames at composition fps. Mixed cadence isn't worth it.
- **Two files:** `final.mp4` (CRF 16, about 15-30 Mbps, probably 500 MB or more) for YouTube and the archive, and `upload-copy.mp4` (CRF 20, `-maxrate 10M`, about 250-300 MB) for Drive and any form upload.
- **Host:** **YouTube Unlisted** (anyone with the link, no Google account needed; embeddable) as primary. **Drive MP4 with "Anyone with the link: Viewer"** as second. Not "Restricted" (the classic failure) and not YouTube "Private". Vimeo free: public videos with embedding off are unlimited, but embeddable and non-public ones share a 3 GB lifetime cap; only a fallback.
- **Captions:** upload the `.srt` to YouTube as the caption track **and** burn the same text in (so a muted judge still reads it). The SRT is the source of truth. Proof-read brand words (CounterCall, Ramp, Twilio, BEC, Acme).
- **What the Google Form likely needs:** I could load only page 1 of 5 anonymously. It asks for the email, mentions one application per team, and the Nov 10 11:59 PM PT deadline. It did **not** show a sign-in wall. A file-upload question forces Google sign-in, so that is weak evidence **there is no file upload and it takes URLs** (inference, medium confidence). Prepare both: a YouTube link, a Drive link, the GitHub URL. If an upload field exists: per-file limits are 1 MB to 10 GB, files count against the form owner's Drive, and respondents must sign in with a Google account (secondary sources, September 2026).
- **Submission hygiene:** upload to YouTube at least 2 hours before the deadline (HD processing plus the Content-ID check). Open both links in an **incognito window**. Confirm audio plays and captions are on.

---

## 6. The pipeline for tomorrow

### 6.1 Roles
**P** = Producer/Editor (script lock, VO audio, mix, export). **C** = Capture lead (app, call, phone). **M** = Motion dev (Remotion, with Claude Code). Who is who is a team call; the narrator should be the best voice.

### 6.2 Tonight (Mon, 45-60 min, one person; cheap insurance)
Do C1 below; buy Screen Studio monthly; grant Mac permissions (Screen Recording, Accessibility, Microphone); create the shared Drive folder `countercall-video/` with the same subfolders as `/video/public`; test a Twilio dual-channel download; do a 1-minute mic test in the closet.

### 6.3 Tomorrow, wall-clock (about 7.25 h, about 11.5 person-hours)

Rule: **UI frozen and demo mode working before capture starts.** Final upload at least 2 h before 11:59 PM PT.

| Clock | Step | Owner | Box | Output |
|---|---|---|---|---|
| 0:00-0:30 | **Script lock with 07**: VO text, scene markers in seconds, shot list | P (+07's output) | 20 min | `script.md`, `MARKS` for `timeline.ts` |
| 0:00-0:30 | Demo-mode check, fixed viewport, clean profile | C | 30 min | App ready to record |
| 0:00-0:30 | Scaffold `/video`, install, fonts, brand (skip if done Monday) | M | 30 min | `npm run studio` works |
| 0:30-1:30 | **Record VO** (closet), 2-3 takes per paragraph | P (narrator) | 40 min + 20 min clean | `vo-takes/*.wav` |
| 0:30-2:00 | **Record app takes** (Screen Studio): 6-8 shots x 2-3 takes, 10-20 s each | C | 90 min | Path A/B clips |
| 0:30-2:15 | Remotion scenes: problem/kinetic, stat counters, architecture | M | 60 + 45 min | `Problem`, `Arch` |
| 1:30-2:15 | VO select, cut, Studio Sound, **master VO** and **SRT** (Descript) | P | 45 min | `vo-master.wav`, `captions.srt` |
| 2:00-2:45 | **Record the real call** (hero take plus retakes): dashboard, Twilio, phone | C (+P as vendor) | 45 min | raw take, recording SID, event log |
| 2:15-3:00 | Clean call audio, make WAV, CFR transcodes of clips | C | 30 min | `call-48k.wav`, `*.mp4` |
| 2:15-3:00 | Music pick, SFX synthesis, first mix | P | 45 min | `premaster.wav` |
| 2:45-4:15 | Call scene (waveform plus real transcript), integrate takes with `ScreenClip`, tilt-ins | M | 45 + 60 min | `Main` assembled |
| 3:00-4:15 | Final mix and **loudnorm two-pass** | P | 30 min | `master.wav` (-14 LUFS) |
| 4:15-5:00 | **Draft render, whole team watches once**, notes | all | 45 min | `draft.mp4`, fix list |
| 5:00-6:00 | Fix pass: re-record VO lines, adjust zooms, cut dead air | P, M, C | 60 min | |
| 6:00-6:45 | **Final render** (`--muted`), mux, QC on phone speaker and laptop, export two files | M, P | 45 min | `final.mp4`, `upload-copy.mp4` |
| 6:45-7:15 | **Upload**: YouTube Unlisted, Drive; incognito test; submit | P | 30 min | links |

**Cut line if running late** (cut in this order): animate-in tilt, ArchDiagram becomes a static still, stat counters become static numbers, music becomes silence under VO. **Never cut:** VO, the real call take, three clean screen shots, captions, loudness.

### 6.4 Folder structure

```
countercall/
  app/ or src/ ...                 # Next.js app; shared UI in components/ui/*
  video/                           # Remotion project, own package.json and node_modules
    package.json  remotion.config.ts  tsconfig.json  .gitignore
    src/  index.ts  Root.tsx  timeline.ts  brand.ts  fonts.ts  index.css
          components/  Kinetic.tsx  ArchDiagram.tsx  ScreenClip.tsx  CallWave.tsx  Captions.tsx
          scenes/      (one file per scene once 07's storyboard lands)
    public/ takes/ vo/ music/ sfx/ call/ captions/ audio/    # gitignored; mirror in shared Drive
    scripts/ record.mjs  call-clean.sh  loudnorm2.sh  mix.sh  sfx.sh  finish.sh  burn.sh
    out/                                                     # gitignored
```

**Reusing the app's components in Remotion (rules I verified by rendering one):**
- Keep shared components in `components/ui/*` as **pure presentational** components: props in, JSX out. **No `next/image`, `next/link`, `next/font`, server-only code, or data hooks inside them.** The page-level container does the data fetching.
- Alias `@/` in `video/remotion.config.ts` to match the app's `tsconfig` `paths` (see snippet), using `process.cwd()`.
- Tailwind v4: `npm i -D @remotion/tailwind-v4 tailwindcss`, plus `@source "../../<app dir>"` in `video/src/index.css` so classes from the app dir get generated. I used `@source`; I did not test without it.
- **Add `"exclude": ["video"]` to the root `tsconfig.json`** (and `.vercelignore` if needed). Otherwise `next build` will type-check Remotion files and can fail the Vercel build.
- Components must read fonts through CSS variables (`font-family: var(--font-mono)`). Remotion defines the same variables in `index.css`.
- Don't commit media. A tidy `/video` with source only is itself a "Technical execution" signal for judges.

### 6.5 Install, render commands, and the Remotion skeleton

```bash
# each Mac, once
brew install ffmpeg node@22          # then: ffmpeg -version ; node -v
cd video
npm init -y
npm i remotion@4.0.539 @remotion/cli@4.0.539 @remotion/media@4.0.539 @remotion/media-utils@4.0.539 \
  @remotion/captions@4.0.539 @remotion/transitions@4.0.539 @remotion/google-fonts@4.0.539 \
  @remotion/paths@4.0.539 @remotion/layout-utils@4.0.539 react@19 react-dom@19
npm i -D @remotion/tailwind-v4@4.0.539 tailwindcss typescript @types/react@19
npx remotion browser ensure          # downloads Chrome Headless Shell NOW, while you have network

npx remotion studio                                     # live preview
npx remotion render src/index.ts Main out/draft.mp4 --scale=0.5 --crf=28 --color-space=bt709
npx remotion render src/index.ts Main out/picture.mp4 --codec=h264 --crf=16 --color-space=bt709 --muted
npx remotion render src/index.ts Main out/picture-4k.mp4 --scale=2 --crf=16 --color-space=bt709 --muted   # Nov 19 only
npx remotion still  src/index.ts Thumb out/thumb.png
```

Flags exist on 4.0.539 (checked with `--help`): `--muted --scale --crf --color-space --concurrency --frames --hardware-acceleration --x264-preset --props`. `--crf` cannot be combined with hardware acceleration (docs).

`remotion.config.ts`:

```ts
import path from 'node:path';
import {Config} from '@remotion/cli/config';
import {enableTailwind} from '@remotion/tailwind-v4';

Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(16);
Config.setColorSpace('bt709');   // default tags yuvj420p/bt470bg; fix it
// '@' must match the app's tsconfig paths. process.cwd(), NOT __dirname (it points at the CLI).
Config.overrideWebpackConfig((c) => enableTailwind({
  ...c,
  resolve: {...c.resolve, alias: {...(c.resolve?.alias ?? {}), '@': path.resolve(process.cwd(), '..')}},
}));
```

`src/index.css`: `@import 'tailwindcss'; @source "../../components";`

`src/timeline.ts` (audio-first; **07 fills `MARKS`/`END_S`**; scene lengths derive from the VO so picture can't drift):

```ts
export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);
export const TRANSITION = sec(0.5);            // TransitionSeries subtracts overlap from the total

const MARKS = [
  ['coldOpen', 0], ['problem', 12], ['detector', 40], ['holdAndLookup', 75], ['liveCall', 105],
  ['outcome', 165], ['architecture', 195], ['failClosed', 230], ['outro', 255],
] as const;                                    // seconds in the locked VO (placeholder)
const END_S = 270;                             // 4:30 -> 8100 frames

export type SceneId = (typeof MARKS)[number][0];
export const SCENES = Object.fromEntries(MARKS.map(([id, start], i) => {
  const last = i === MARKS.length - 1;
  const next = last ? END_S : MARKS[i + 1][1];
  return [id, sec(next - start) + (last ? 0 : TRANSITION)];
})) as Record<SceneId, number>;
export const TOTAL = sec(END_S);
```

`src/Root.tsx` (composition list; typechecked `--strict` and rendered):

```tsx
import './index.css';
import {AbsoluteFill, Composition, Folder, Still, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {FPS, SCENES, TOTAL, TRANSITION} from './timeline';
import './fonts';
import {Captions} from './components/Captions';
// ...scene imports...

const W = 1920, H = 1080;
const T = linearTiming({durationInFrames: TRANSITION});

const Main: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENES.coldOpen}><ColdOpen /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={T} />
      <TransitionSeries.Sequence durationInFrames={SCENES.problem}><Problem /></TransitionSeries.Sequence>
      {/* ...one Sequence + Transition pair per scene in SCENES order... */}
    </TransitionSeries>
    <Audio src={staticFile('audio/master-mix.wav')} />      {/* preview only; final render uses --muted */}
    <Captions file="captions/captions.srt" />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Folder name="scenes">
      <Composition id="Problem" component={Problem} durationInFrames={SCENES.problem} fps={FPS} width={W} height={H} />
      <Composition id="Arch" component={ArchDiagram} durationInFrames={SCENES.architecture} fps={FPS} width={W} height={H} />
      {/* one Composition per scene so you can iterate on one scene without rendering the whole video */}
    </Folder>
    <Still id="Thumb" component={Problem} width={W} height={H} />
  </>
);
```

`src/brand.ts` and `src/fonts.ts` (placeholders: match agent 04's tokens; Greptile-like values from the shared brief):

```ts
// brand.ts
export const brand = {
  bg: '#e9e9e9', ink: '#3d3b4f', mint: '#28e99f', lime: '#ecffa3', pink: '#ffacfe', white: '#ffffff',
  display: '"Anybody", sans-serif', body: '"DM Sans", sans-serif', mono: '"Space Mono", monospace',
} as const;

// fonts.ts  (needs network at render time; self-host if venue Wi-Fi is risky)
import {loadFont as loadAnybody} from '@remotion/google-fonts/Anybody';
import {loadFont as loadDMSans} from '@remotion/google-fonts/DMSans';
import {loadFont as loadSpaceMono} from '@remotion/google-fonts/SpaceMono';
export const fontsReady = Promise.all([
  loadAnybody('normal', {weights: ['800'], subsets: ['latin']}).waitUntilDone(),
  loadDMSans('normal', {weights: ['400', '500'], subsets: ['latin']}).waitUntilDone(),
  loadSpaceMono('normal', {weights: ['400', '700'], subsets: ['latin']}).waitUntilDone(),
]);
```

`components/Kinetic.tsx` (kinetic type and counters):

```tsx
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {brand} from '../brand';

export const KineticLine: React.FC<{text: string; size?: number; delay?: number; color?: string}> = ({text, size = 120, delay = 0, color = brand.ink}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: size * 0.25, fontFamily: brand.display, fontSize: size, fontWeight: 800, letterSpacing: -size * 0.025, lineHeight: 1, color}}>
      {text.split(' ').map((w, i) => {
        const p = spring({frame: frame - delay - i * 4, fps, config: {damping: 200}});   // 200 = no bounce
        return (
          <span key={i} style={{overflow: 'hidden', display: 'inline-block', paddingBottom: size * 0.12}}>
            <span style={{display: 'inline-block', transform: `translateY(${interpolate(p, [0, 1], [105, 0])}%)`}}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

export const CountUp: React.FC<{to: number; suffix?: string; durationInFrames?: number; size?: number}> = ({to, suffix = '', durationInFrames = 45, size = 260}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = spring({frame, fps, durationInFrames, config: {damping: 200}});
  return <span style={{fontFamily: brand.display, fontWeight: 800, fontSize: size, color: brand.ink, fontVariantNumeric: 'tabular-nums'}}>{Math.round(p * to)}{suffix}</span>;
};
```

`components/ArchDiagram.tsx` (edges draw on, a packet travels, boxes spring in; edit the `NODES`/`EDGES` arrays):

```tsx
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {brand} from '../brand';

type Node = {id: string; label: string; sub: string; x: number; y: number; w: number; h: number};
const NODES: Node[] = [
  {id: 'email',  label: 'AP EMAIL',    sub: 'AgentMail webhook',        x: 80,   y: 200, w: 340, h: 130},
  {id: 'detect', label: 'DETECTOR',    sub: 'LLM + rules',              x: 560,  y: 200, w: 340, h: 130},
  {id: 'policy', label: 'POLICY',      sub: 'deterministic code',       x: 1040, y: 200, w: 340, h: 130},
  {id: 'call',   label: 'VOICE AGENT', sub: 'dials trusted number only', x: 560,  y: 560, w: 340, h: 130},
  {id: 'ramp',   label: 'RAMP',        sub: 'hold / release bill',      x: 1040, y: 560, w: 340, h: 130},
];
const EDGES = [{from: 'email', to: 'detect', at: 30}, {from: 'detect', to: 'policy', at: 60},
               {from: 'policy', to: 'call', at: 90}, {from: 'call', to: 'ramp', at: 120}];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
const edgePath = (a: Node, b: Node) => {
  const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
  const [x1, y1] = horiz ? [a.x + a.w, a.y + a.h / 2] : [a.x + a.w / 2, a.y + a.h];
  const [x2, y2] = horiz ? [b.x, b.y + b.h / 2] : [b.x + b.w / 2, b.y];
  return `M ${x1} ${y1} L ${x2} ${y2}`;
};

export const ArchDiagram: React.FC = () => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: brand.bg}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {EDGES.map((e) => {
          const d = edgePath(byId[e.from], byId[e.to]);
          const p = interpolate(frame - e.at, [0, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const dot = getPointAtLength(d, getLength(d) * p);
          return (
            <g key={e.from + e.to}>
              <path d={d} fill="none" stroke={brand.ink} strokeWidth={2} strokeDasharray="8 8" opacity={0.25} />
              <path d={d} fill="none" stroke={brand.ink} strokeWidth={3} {...evolvePath(p, d)} />
              {p > 0 && p < 1 && dot && <rect x={dot.x - 7} y={dot.y - 7} width={14} height={14} fill={brand.mint} />}
            </g>
          );
        })}
      </svg>
      {NODES.map((n, i) => {
        const s = spring({frame: frame - i * 14, fps, config: {damping: 200}});
        return (
          <div key={n.id} style={{position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h, border: `1px dashed ${brand.ink}`, background: brand.bg, padding: 20, boxSizing: 'border-box', opacity: s, transform: `translateY(${(1 - s) * 24}px)`, fontFamily: brand.mono, color: brand.ink}}>
            <div style={{fontSize: 22, letterSpacing: 3, fontWeight: 700}}>{n.label}</div>
            <div style={{fontSize: 18, marginTop: 10, opacity: 0.7}}>{n.sub}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
```

`components/ScreenClip.tsx` (composites a real recording with an eased "camera", click ripples, and a tasteful tilt-in):

```tsx
import {AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';
import {brand} from '../brand';

export type CamKey = {f: number; x: number; y: number; s: number};   // at frame f look at (x,y) in source px at zoom s
export type Click = {f: number; x: number; y: number};
const ease = Easing.bezier(0.16, 1, 0.3, 1);                          // fast start, long settle = "weighty"

const useCamera = (keys: CamKey[], w: number, h: number) => {
  const frame = useCurrentFrame(); const fr = keys.map((k) => k.f);
  const o = {easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const s = interpolate(frame, fr, keys.map((k) => k.s), o);
  const x = interpolate(frame, fr, keys.map((k) => k.x), o);
  const y = interpolate(frame, fr, keys.map((k) => k.y), o);
  const tx = Math.min(0, Math.max(-(w * s - w), w / 2 - x * s));       // never reveal outside the frame
  const ty = Math.min(0, Math.max(-(h * s - h), h / 2 - y * s));
  return `translate(${tx}px, ${ty}px) scale(${s})`;
};

export const ScreenClip: React.FC<{src: string; srcW: number; srcH: number; camera?: CamKey[]; clicks?: Click[]; trimBefore?: number; durationInFrames?: number}> = ({
  src, srcW, srcH, camera = [{f: 0, x: srcW / 2, y: srcH / 2, s: 1}], clicks = [], trimBefore, durationInFrames,
}) => {
  const frame = useCurrentFrame(); const transform = useCamera(camera, srcW, srcH);
  return (
    <div style={{width: srcW, height: srcH, overflow: 'hidden', position: 'relative', background: '#fff'}}>
      <div style={{width: srcW, height: srcH, transformOrigin: '0 0', transform, position: 'relative'}}>
        <Video src={staticFile(src)} muted trimBefore={trimBefore} durationInFrames={durationInFrames} style={{width: srcW, height: srcH}} />
        {clicks.map((c, i) => {
          const t = frame - c.f; if (t < 0 || t > 18) return null;
          const r = interpolate(t, [0, 18], [8, 46], {easing: Easing.out(Easing.cubic)});
          return <div key={i} style={{position: 'absolute', left: c.x - r, top: c.y - r, width: r * 2, height: r * 2, border: `3px solid ${brand.mint}`, borderRadius: '50%', opacity: 1 - t / 18}} />;
        })}
      </div>
    </div>
  );
};

// Enters at ~10deg, settles flat. Hard offset shadow, no glow, no looping float.
export const TiltIn: React.FC<{children: React.ReactNode; delay?: number}> = ({children, delay = 0}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 200}, durationInFrames: 40});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', perspective: 2400}}>
      <div style={{transform: `rotateX(${(1 - p) * 10}deg) rotateY(${(1 - p) * -12}deg) translateY(${(1 - p) * 40}px)`, boxShadow: `${12 * p}px ${12 * p}px 0 ${brand.ink}`, border: `1px solid ${brand.ink}`, opacity: p}}>{children}</div>
    </AbsoluteFill>
  );
};
```

I did not test pushing a 2880x1800 source through `ScreenClip` at 1.8x zoom. It should use the full-resolution pixels. Check one frame before relying on it.

`components/CallWave.tsx` (call audio as a smooth waveform):

```tsx
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {createSmoothSvgPath, useWindowedAudioData, visualizeAudioWaveform} from '@remotion/media-utils';

export const CallWave: React.FC<{src: string; color: string; width: number; height: number; gain?: number; playAudio?: boolean}> = ({src, color, width, height, gain = 6, playAudio = false}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const {audioData, dataOffsetInSeconds} = useWindowedAudioData({src: staticFile(src), frame, fps, windowInSeconds: 30});  // WAV only
  if (!audioData) return null;
  const wave = visualizeAudioWaveform({audioData, frame, fps, windowInSeconds: 0.08, numberOfSamples: 256, dataOffsetInSeconds});
  const pts = wave.map((v, i) => ({x: (i / (wave.length - 1)) * width, y: height / 2 + Math.max(-1, Math.min(1, v * gain)) * (height / 2) * 0.9}));
  return (
    <AbsoluteFill>
      {playAudio && <Audio src={staticFile(src)} />}
      <svg width={width} height={height}><path d={createSmoothSvgPath({points: pts})} stroke={color} strokeWidth={3} fill="none" /></svg>
    </AbsoluteFill>
  );
};
// Spectrum bars instead: visualizeAudio({audioData, frame, fps, numberOfSamples: 64, dataOffsetInSeconds}) -> number[] (0..1), length must be a power of 2.
```

`components/Captions.tsx` (reads the same SRT you upload to YouTube):

```tsx
import {useCallback, useEffect, useState} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {parseSrt} from '@remotion/captions';
import type {Caption} from '@remotion/captions';
import {brand} from '../brand';

export const Captions: React.FC<{file: string; bottom?: number}> = ({file, bottom = 72}) => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('captions'));
  const {fps} = useVideoConfig(); const frame = useCurrentFrame();
  const load = useCallback(async () => {
    try { const res = await fetch(staticFile(file)); setCaptions(parseSrt({input: await res.text()}).captions); continueRender(handle); }
    catch (e) { cancelRender(e); }
  }, [file, handle, continueRender, cancelRender]);
  useEffect(() => { load(); }, [load]);
  if (!captions) return null;
  const ms = (frame / fps) * 1000;
  const cur = captions.find((c) => ms >= c.startMs && ms < c.endMs);
  if (!cur) return null;
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom}}>
      <div style={{fontFamily: brand.mono, fontSize: 38, textTransform: 'uppercase', letterSpacing: 1, color: brand.white, background: brand.ink, padding: '10px 22px', maxWidth: 1500, textAlign: 'center'}}>{cur.text}</div>
    </AbsoluteFill>
  );
};
```

Verification status: the skeleton (`Root`, `timeline`, and all five components) passes `tsc --strict`. I rendered stills of Problem (kinetic and counter), Arch, and Demo (ScreenClip with camera and tilt), a 1-second slice of `Main` with SRT captions and audio, and `Main` at `--frames=7900-7979` (confirms `TOTAL`=8100 frames).

### 6.6 Playwright capture and zoom keys (Nov 19 / stretch)

`scripts/record.mjs`. Partly tested: `screencast.start` with `size`/`fps` ran and produced the expected VP9 60 fps file. `showActions` and the click-log helper were **not** executed; treat them as a starting point.

```js
import {chromium} from 'playwright';
import fs from 'node:fs';
const OUT = process.env.OUT ?? 'public/takes/pw-case';
const browser = await chromium.launch({headless: true});
// Viewport = output size, DSF 1. DSF 2 does NOT give a 2x video (tested).
const ctx = await browser.newContext({viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1});
const page = await ctx.newPage();
await page.goto(`${process.env.APP_URL}/demo?rec=1&seed=7`);
const t0 = Date.now(); const events = [];
await page.screencast.start({path: `${OUT}.webm`, size: {width: 1920, height: 1080}, fps: 60});
const hide = await page.screencast.showActions({cursor: 'pointer', duration: 600});

const glide = async (x1, y1, x2, y2, ms = 600) => {          // eased path; Playwright's own moves are linear
  const n = Math.round(ms / 16.7);
  for (let i = 1; i <= n; i++) { const e = 1 - (1 - i / n) ** 3; await page.mouse.move(x1 + (x2 - x1) * e, y1 + (y2 - y1) * e); await page.waitForTimeout(ms / n); }
};
let cur = {x: 960, y: 540};
const clickLogged = async (sel) => {
  const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await glide(cur.x, cur.y, x, y); cur = {x, y};
  events.push({t: (Date.now() - t0) / 1000, x, y}); await page.mouse.click(x, y); await page.waitForTimeout(800);
};
// await clickLogged('[data-testid="case-row-acme"]'); ...
await hide[Symbol.asyncDispose]?.();
await page.screencast.stop(); fs.writeFileSync(`${OUT}.events.json`, JSON.stringify(events)); await browser.close();
```

Convert for Remotion, and turn clicks into camera keys:

```bash
ffmpeg -i public/takes/pw-case.webm -vf fps=60 -c:v libx264 -crf 14 -pix_fmt yuv420p -an public/takes/pw-case.mp4
```
```ts
// events.json -> CamKey[]: zoom in 12 frames before each click, release 60 frames after
const keys = events.flatMap((e) => [{f: Math.round(e.t * FPS) - 12, x: e.x, y: e.y, s: 1.6}, {f: Math.round(e.t * FPS) + 60, x: 960, y: 540, s: 1}]);
```
(Keys must be strictly increasing in `f`. Sort and drop overlaps.)

### 6.7 ffmpeg recipes (all executed on ffmpeg 5.1.9; flags unchanged on current Homebrew builds)

**`scripts/call-clean.sh`.** Download, find the channels, clean to 48 kHz stereo WAV.

```bash
#!/usr/bin/env bash
set -euo pipefail
# env: TWILIO_ACCOUNT_SID TWILIO_API_KEY TWILIO_API_SECRET ; arg1 = recording SID
REC="$1"
curl -fsS -u "$TWILIO_API_KEY:$TWILIO_API_SECRET" \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Recordings/$REC.wav?RequestedChannels=2" -o call-dual.wav
for c in 0 1; do echo -n "ch$c RMS dB: "; ffmpeg -v info -i call-dual.wav -af "pan=mono|c0=c$c,astats=metadata=0:reset=0" -f null - 2>&1 | grep -m1 "RMS level dB"; done
# Twilio doesn't say which channel is which party. Listen to each, then if the agent is on ch1, add pan=stereo|c0=c1|c1=c0 first.
# highpass + gentle denoise + light compression; soft stereo spread (agent L ~75%, vendor R ~75%); 8k -> 48k
ffmpeg -y -i call-dual.wav -af "highpass=f=100,afftdn=nr=8:nf=-45,acompressor=threshold=-20dB:ratio=3:attack=10:release=150:makeup=2,pan=stereo|c0=0.75*c0+0.25*c1|c1=0.25*c0+0.75*c1,aresample=48000" -c:a pcm_s16le call-clean.wav
# dual-mono "phone" alternative (no hard pan, easier on headphones):
ffmpeg -y -i call-dual.wav -af "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,aresample=48000" call-dualmono.wav
```

**`scripts/loudnorm2.sh`.** Two-pass loudnorm with measured values; verified to land at -14.0 LUFS on one test and -13.7 on another.

```bash
#!/usr/bin/env bash
# usage: loudnorm2.sh in.(wav|mp4) out.wav [I=-14] [TP=-1] [LRA=11]
set -euo pipefail
IN="$1"; OUT="$2"; I="${3:--14}"; TP="${4:--1}"; LRA="${5:-11}"
J=$(ffmpeg -hide_banner -nostats -i "$IN" -vn -af "loudnorm=I=$I:TP=$TP:LRA=$LRA:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | jq -r ".$1"; }
ffmpeg -hide_banner -nostats -y -i "$IN" -vn -af "loudnorm=I=$I:TP=$TP:LRA=$LRA:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true:print_format=summary,aresample=48000" -c:a pcm_s24le "$OUT"
# verify:
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | tail -12 | grep -E "I:|LRA:|Peak:"
```
(`brew install jq` if missing. loudnorm resamples internally to 192 kHz, hence the trailing `aresample=48000`.)

**`scripts/mix.sh`.** VO plus music (-20 dB, ducked under VO) plus the call stem delayed to its start time.

```bash
#!/usr/bin/env bash
# usage: mix.sh vo.wav music.wav call-clean.wav CALL_START_MS out.wav
set -euo pipefail
VO="$1"; MUSIC="$2"; CALL="$3"; T="$4"; OUT="$5"
ffmpeg -hide_banner -y -i "$VO" -i "$MUSIC" -i "$CALL" -filter_complex "
[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][vosc];
[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-20dB[m];
[m][vosc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=500[duck];
[2:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${T}|${T}[call];
[vo][duck][call]amix=inputs=3:normalize=0:duration=longest[mix]" -map "[mix]" -c:a pcm_s24le "$OUT"
# then: scripts/loudnorm2.sh premaster.wav master.wav
```
(The VO already contains the narration. If the narration speaks over the call, duck the call too; this recipe does not.)

**`scripts/sfx.sh`.** Phone SFX with zero licensing.

```bash
# US ringback 440+480 Hz, 2 s on / 4 s off (12 s)
ffmpeg -y -f lavfi -i "sine=f=440:d=12" -f lavfi -i "sine=f=480:d=12" -filter_complex "[0][1]amix=inputs=2:normalize=0,volume='if(lt(mod(t,6),2),0.35,0)':eval=frame,aformat=sample_rates=48000:channel_layouts=stereo[o]" -map "[o]" -c:a pcm_s16le ringback.wav
# dial tone 350+440 Hz (3 s)
ffmpeg -y -f lavfi -i "sine=f=350:d=3" -f lavfi -i "sine=f=440:d=3" -filter_complex "[0][1]amix=inputs=2:normalize=0,volume=0.35,aformat=sample_rates=48000:channel_layouts=stereo[o]" -map "[o]" -c:a pcm_s16le dialtone.wav
# UI tick (30 ms blip)
ffmpeg -y -f lavfi -i "sine=f=1800:d=0.03" -af "afade=t=out:st=0.01:d=0.02,volume=0.5,aformat=sample_rates=48000:channel_layouts=stereo" tick.wav
```

**`scripts/finish.sh`.** Mux picture and master audio, plus an upload copy.

```bash
# picture.mp4 is already H.264/BT.709 from Remotion -> copy the video stream (no re-encode)
ffmpeg -y -i out/picture.mp4 -i audio/master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/final.mp4
# smaller copy for Drive / form upload (~250-300 MB for 4:30)
ffmpeg -y -i out/final.mp4 -c:v libx264 -preset slow -crf 20 -maxrate 10M -bufsize 20M -pix_fmt yuv420p -profile:v high \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 256k -movflags +faststart out/upload-copy.mp4
# check tags and loudness
ffprobe -v error -show_entries stream=codec_name,pix_fmt,color_space,color_range -of csv=p=0 out/final.mp4
ffmpeg -nostats -i out/final.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12 | grep -E "I:|Peak:"
```
(`-colorspace ... -color_range tv` flags were verified on an encode. The `-maxrate` upload-copy encode wasn't run separately; flags are standard.)

**Trim, concat, CFR, burn-in, VFR normalize (all tested):**

```bash
# trim, frame-accurate (re-encode)
ffmpeg -ss 1 -to 3 -i in.mp4 -c:v libx264 -crf 18 -pix_fmt yuv420p -an t1.mp4
# concat identical-codec segments (stream copy)
printf "file 't1.mp4'\nfile 't2.mp4'\n" > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy cat.mp4
# VFR screen recording -> constant 60 fps (do this if Remotion shows stutter or off-by-one frames)
ffmpeg -i take.mov -vf fps=60 -c:v libx264 -crf 14 -pix_fmt yuv420p -an take.mp4
# burn captions with ffmpeg (fallback to the Remotion Captions component); use fontsdir=./fonts for brand fonts
ffmpeg -i final.mp4 -vf "subtitles=captions.srt:fontsdir=./fonts:force_style='FontName=Space Mono,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1.5,Shadow=0,Alignment=2,MarginV=60'" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy burned.mp4
# subtle grain over everything (optional)
ffmpeg -i final.mp4 -vf "noise=alls=6:allf=t" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a copy grain.mp4
```
The font name in `force_style` must match an installed font or one in `fontsdir`. I tested burn-in with DejaVu Sans Mono only. Space Mono wasn't installed in the sandbox.

---

## 7. Costs for one month

| Item | Free path | Recommended |
|---|---|---|
| Remotion | $0 (individuals / up to 3) | $0 (Creators $25/seat if license is ever questioned) |
| Screen Studio | Cap $0 | **$29** (one month, one seat; $9/mo if you take the $108 annual; student 40% off) |
| Resolve 21 | $0 | $0 |
| Descript | $0 (60 media-min, 720p) | $0 (Hobbyist $16-24/mo only if you blow the minutes) |
| Adobe Podcast Enhance | $0 | $0 |
| ElevenLabs | $0 | **$1** first month Starter (then $6), only if you need fallback VO or music |
| Music | Uppbeat free (credit) $0 | $0, or ElevenLabs Music via Starter |
| SFX | $0 (synthesized / own recording) | $0 |
| Hosting | YouTube + Drive $0 | $0 |
| **Total** | **$0** | **about $30-40** |

---

## 8. For the Nov 19 live final: reusable assets

- Everything in `/video` is parameterized. Change `MARKS`, takes, and captions, re-render. Rebuild Playwright takes after UI changes (section 6.6).
- Render the 4K version (`--scale=2`) after the submission is safe.
- Export `Still`s for slides (architecture diagram, stat cards, thumbnail).
- Export **silent 15-30 s loops** from Screen Studio as slide backgrounds.
- **Keep a local MP4 of the full demo on the presenting laptop plus a USB stick.** Never depend on venue Wi-Fi to play the backup. If the live call fails on stage, the recorded one plays.
- The live demo runs on the same demo-mode data and replay hooks as the video (hand-offs below), so the on-stage UI matches the video.

---

## 9. Hand-offs

### To 07 (storyboard constraints: what is cheap vs expensive)

**Cheap (design the story around these):**
- Kinetic type cards, stat counters (75%, 22%).
- The architecture diagram build (nodes, edges, a packet).
- UI component animations with seeded data, via Remotion and the app's own components.
- Call audio as a waveform, with the real transcript replayed in sync.
- Screen Studio takes with auto-zoom, 10-20 s each.
- Simple fades and hard cuts, one tilt-in per hero shot, brand-styled captions.
- Synthesized ringback and dial tone, and a real phone ringing (one take).

**Medium:**
- Three simultaneous angles of the live call (dashboard, phone, waveform). Needs real sync.
- Picture-in-picture of a teammate. Annotated callouts.

**Expensive / avoid:**
- Talking-head or lit camera footage.
- 3D / Three.js scenes, custom illustration, character animation.
- AI-generated video b-roll or avatars. They look AI-generated and add licensing and iteration cost.
- Re-recording the live call many times (non-deterministic). Budget **1 hero take plus 2-3 retakes**.
- Uninterrupted screen takes longer than 20 s (hard to cut). Speed ramps. Maps.

**Timing and format rules:**
- Deliver the **VO script with scene tags and target seconds**. About 150 wpm, so a 4:30 video is about 600-650 words. These become `MARKS` in `timeline.ts`.
- Show the real call **once, at full length**; don't cut to a simulated one. Everything else is cutaways.
- Reserve 20-30 s for fail-closed design and architecture (35% of the rubric is technical execution).
- On-screen text at least 40 px at 1080p. Keep the caption-safe margin at the bottom (about 160 px).
- Label the agent as "AI voice agent" on screen.
- Avoid any dependence on stock footage.

### To the app agents (04 design system, 05 app UI, 01 voice agent)

1. **Demo mode** (`?demo=1&rec=1&seed=7` or a `/demo` route) with **deterministic seed data**: fixed vendor, amounts, IDs, and a **pinned "now"** (so "2 min ago" never varies). No real emails, phone numbers (except consenting team numbers), or keys visible.
2. **Scenario replay:** a scripted event stream (email arrives, detection chips appear, payment held, call connecting, transcript lines with ms offsets, outcome) at controllable speed. It makes video shots, Playwright takes, and the live final reproducible. Replay the real call's transcript timestamps for sync with the real audio.
3. **Record mode (`rec=1`):** base type 16-18 px, **minimum 13 px** for mono labels (10-11 px labels are unreadable in video at 1080p), high contrast, hide scrollbars.
4. **Fixed viewport 1440x900** at 2x (Retina) for Screen Studio. Don't rely on responsive breakpoints for the recorded layout.
5. **Hide dev overlays:** Next.js `devIndicators: false`, no React Query devtools, no Vercel toolbar on preview deployments, no console errors. **Record from a production build** (`next build && next start`) or the Vercel production URL.
6. **Presentational components:** put shared UI in `components/ui/*` as props-in/JSX-out. No `next/*`, server-only code, or data hooks inside (section 6.4). Read fonts via CSS variables (`--font-mono` etc.). Keep animations driven by CSS or props, not wall-clock timers.
7. **Test hooks:** `data-testid` on key rows and buttons, so Playwright takes can find coordinates.
8. **Layout:** a large call/transcript panel that reads at video size. A light `#e9e9e9` background is fine.
9. **To 01:** download dual-channel (`RequestedChannels=2`), log call-event timestamps, and if cheap, save the agent's clean TTS stream separately. If we ever swap the agent stream in for intelligibility, apply the same phone bandpass and be able to say so.
10. Add `"exclude": ["video"]` to the root `tsconfig.json` so `next build` ignores the Remotion project.

---

## 10. Things most likely to bite on video day

1. **Capture starts before the UI and demo mode are ready,** leaving the whole pipeline in the last 3 hours. Freeze the UI first. Without scenario replay, every retake is manual and different.
2. **The real call is non-deterministic and narrowband.** Channel mapping is undocumented, so test it. Budget retakes. Never "enhance" it.
3. **Remotion environment surprises:**
   - First render downloads Chrome (needs network).
   - Google Fonts load over the network at render time.
   - `__dirname` is wrong in `remotion.config.ts`.
   - `next/*` imports in shared components break the bundle.
   - `next build` type-checks `/video` unless excluded.
   - All `@remotion/*` versions must match.
   - Default color tags are wrong without `--color-space=bt709`.
   - Mac render time is unmeasured; do a full-length draft render early.
4. **Audio:** bare-room VO, Bluetooth mics, stacked enhancers, loudnorm off by a few tenths (verify with `ebur128`), and a Content-ID claim on the music muting the YouTube copy. Always check on a phone speaker.
5. **Submission links:** Drive left on "Restricted", YouTube still processing, the Form wanting an upload that needs Google sign-in. Upload at least 2 hours early and test in incognito.

---

## Verification ledger

**Run by me today (2026-11-09, Linux sandbox; Mac behavior not tested):**
- Playwright 1.64.1 `page.screencast` fps, size, DSF behavior (4 experiments, section 1.1).
- Remotion 4.0.539:
  - install and render
  - `@remotion/media` `Video`/`Audio`
  - `useWindowedAudioData` with `visualizeAudio` and `visualizeAudioWaveform`
  - `--color-space=bt709` and `--scale=2`
  - Tailwind v4 shared-component alias render
  - `TransitionSeries`, SRT `Captions`
  - `tsc --strict` on the skeleton
  - stills of Problem, Arch, Demo
- ffmpeg 5.1.9: two-pass loudnorm, dual-channel pan/clean, ducked mix, ringback/dial tone/tick, subtitles burn, mux, trim, concat, final encode tags, CFR transcode.
- npm registry versions and licenses; GitHub licenses and activity via the API.

**Read from official pages today:**
- Remotion `LICENSE.md` (npm package and GitHub raw), license FAQ, remotion.pro pricing, `@remotion/media` `<Video>` docs, `visualizeAudio` docs, Tailwind docs, config docs.
- Playwright docs: Screencast API and release notes (v1.59-1.64).
- Screen Studio pricing page. Cap pricing page and GitHub README.
- DaVinci Resolve page. Descript pricing. ElevenLabs models doc, best-practices doc, and pricing.
- Twilio Recording docs. YouTube recommended upload settings. Apple Final Cut page. CapCut pricing.
- Form page 1 (anonymous).

**Secondary or conflicting (verify before spending money):**
- Screen Studio 4 changelog (via a competitor's blog, Prequel).
- Tella, FocuSee, Loom, Jitter, Rive, After Effects prices.
- Epidemic, Artlist, Uppbeat terms (official Uppbeat page returned 429).
- Suno terms (change dated 2026-09-03; lawsuits).
- Adobe Podcast limits and pricing.
- Vimeo plans and limits.
- Google Forms upload limits.
- Studio Sound intensity range.

**Not verified:**
- Mac render speed.
- Screen Studio export decoding in `@remotion/media`, and hands-on zoom quality.
- `showActions` and the click-log helper in `record.mjs`.
- Playwright screencast softness on a text-dense animated UI.
- Tailwind `@source` necessity.
- North American tone-plan frequencies (standards knowledge).
- ElevenLabs numeric voice settings.
- 2880x1800 source through `ScreenClip` at 1.8x.

**Sources (accessed 2026-11-09):**
- https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md
- https://www.remotion.dev/docs/license/faq
- https://www.remotion.pro/license
- https://www.remotion.dev/docs/media/video
- https://www.remotion.dev/docs/visualize-audio
- https://www.remotion.dev/docs/tailwind
- https://www.remotion.dev/docs/config
- https://github.com/remotion-dev/remotion/pull/3750
- https://playwright.dev/docs/api/class-screencast
- https://playwright.dev/docs/release-notes
- https://screen.studio/
- https://prequel.sh/blog/screen-studio-4
- https://cap.so/pricing
- https://github.com/CapSoftware/Cap
- https://www.blackmagicdesign.com/products/davinciresolve
- https://www.descript.com/pricing
- https://elevenlabs.io/docs/overview/models
- https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- https://elevenlabs.io/pricing
- https://www.twilio.com/docs/voice/api/recording
- https://support.google.com/youtube/answer/1722171
- https://www.apple.com/final-cut-pro/
- https://www.capcut.com/pricing
- https://docs.google.com/forms/d/e/1FAIpQLSc1EeEuNDXVaiyJqjBFQK__b_oLcfZ4g6t5hpGkZI0s_AC_8A/viewform (redirect target of the team's `forms.gle` link)
