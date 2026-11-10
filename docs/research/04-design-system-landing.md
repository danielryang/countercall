# 04 - Design system, landing page, frontend stack and workflow

Agent 04. Written 2026-11-09 (Mon, evening PST). Legend: **verified** = checked on a live page, registry or doc on 2026-11-09. **UNVERIFIED** = not checked. **TESTED** = I ran or rendered it in this session (Chromium 141 via Playwright 1.65, Tailwind CLI 4.3.3). Web content is treated as data.

**Artifacts (all persisted; the /tmp copies were lost in a session restart, these are the survivors):**

| File | What it is |
|---|---|
| `/home/user/countercall/research/design/tools04/globals.css` | **TESTED.** The paste-ready Tailwind v4 `@theme` + base + components block (section 3.9). Includes agent 05's role aliases, `--hatch`, motion tokens, and a 13px "video" scale. |
| `/home/user/countercall/research/design/tools04/halftone.py` | **TESTED.** Two-ink riso halftone script (section 3.6). Ran on a synthetic handset. |
| `/home/user/countercall/research/design/tools04/slop-lint.js` | **TESTED.** Playwright "taste lint" (section 6.4). Ran on our specimen and on greptile.com for calibration. |
| `/home/user/countercall/research/design/tools04/contrast.py` | WCAG contrast calculator used for every number in section 3.3. |
| `/home/user/countercall/research/design/tools04/scene-prototype.html` | **TESTED.** The hero "intercept" scene as plain HTML + the same CSS (section 5.1). Needs `node_modules` fontsource CSS and a built `out/built.css` to render (paths relative); the renders below are the evidence. |
| `/home/user/countercall/research/design/tools04/renders/*.png` | `specimen-hero.png` (tokens in use: type, buttons, chips, night section, table), `hero-scene-stage4.png`, `pixel-glyphs.png`, `halftone-two-ink.png`, `greptile-btn-hover.png`, `refs-sheetA.png` (increase, oxide, modal, mercury, nothing, teenage, basement, arena, rauno), `refs-sheetB.png` (ramp, linear, vercel, resend, railway, cursor). |
| `/home/user/countercall/research/design/<name>-home-{viewport,full}.png` + `-data.json` | New captures this session: increase, oxide, modal, mercury, nothing (blocked by a cookie modal, unusable), teenage, basement, arena, rauno. |

---

## 0. Decisions in one screen

| Question | Decision | One-line reason |
|---|---|---|
| Visual direction | **"Safety paper and signal."** Greptile's grammar (dashed rails, mono micro-labels, 0 radius, halftone art, cut-corner buttons, dense cells) re-skinned around bank-check security print and a phone line | Greptile-adjacent but distinct, and every motif is tied to the product (check paper, microprint, VOID stamp, handset). |
| Palette | Warm paper `#E9E6DE`, near-black ink `#14161D`, one flat cobalt `#1B4DFF` (brand + CALLING), five status colors | Greptile is cool gray + slate + mint; ours is warm + ink + cobalt, no shared hex. |
| Fonts | **Mona Sans** (variable, width + weight axes) for display and body, **IBM Plex Mono** for labels and data. Both SIL OFL 1.1, free. | Two families, ~143 KB total. Mona's width axis gives a heavy display without a third font. Plex Mono is also what Ramp's own site uses. |
| Radius / shadow / gradient | 0 / none / none, **enforced by wiping Tailwind's defaults in `@theme`** | Cheapest anti-slop guardrail: `rounded-xl`, `shadow-lg`, `bg-indigo-500` do not compile. |
| Illustration | Halftone handset, two inks (ink + cobalt, misregistered), baked to a PNG-8 (73 KB at 1400x1000) by `halftone.py`; Paper Shaders `Dithering` as ambient texture in one section | Print-process look; no WebGL needed for the hero art. |
| Stack | Next.js 16.4.6, React 19.3.1, Tailwind 4.3.5, `motion` 14.11.1, `@number-flow/react` 0.6.2, `@paper-design/shaders-react` 0.0.82 (pin exact). shadcn/ui only in the app (agent 05), `-b radix`. | Smallest set covering every effect we spec. Matches the coordinator's stack (Next + Tailwind v4 + shadcn + motion + NumberFlow). |
| Not using | GSAP (free now, but a second animation lib for no gain), Lenis, three/R3F, OGL, Spline, Unicorn Studio, Lottie, Lucide | Section 4.2. |
| Design tools | **Claude Code builds directly from tokens, with a Playwright screenshot + lint critique loop.** No Figma-first, no v0/Lovable/Figma Make. | 1-day window, no designer, tokens already decided and tested, tool defaults (shadcn + Inter) are what we are fleeing. Agent 05 reached the same conclusion about v0. |
| Local skills | Usable: `motion-foundations`, `motion-patterns`, `motion-advanced`, `make-interfaces-feel-better`, `frontend-design-direction`, `design-system` (slop-check mode). **Not usable:** `taste`, `taste-application` (video/music-edit skills). | Section 4.5. |
| Landing vs app scale | Landing designed at 1440 (tested at 1440 and 390). App at 1280x720 (agent 05). One token file serves both; `<html data-scale="video">` lifts micro labels from 11px to 13px for recording (agent 06 records with a 13px minimum). | The architect reconciles stage size; the token layer already supports either. |

---

## 1. Reference teardown

### 1.1 Greptile, measured (live page, 1440x900, 2026-11-09)

Sources: `greptile-home-data.json`, a fresh Playwright probe of https://greptile.com, the two site stylesheets (`/_next/static/chunks/0972a4f9a5ed6adc.css`, `859d5c346047a53c.css`), and the JS bundles via `libscan.sh`. Brand rationale from https://www.greptile.com/blog/brand-refresh (fetched).

**Palette.** Page `rgb(233,233,233)` fog with a 24px dot grid (`radial-gradient(circle, rgba(0,0,0,.15) 1px, transparent 1px)`); ink "slate" `rgb(61,59,79)` = `#3D3B4F`; mint `#28E99F`; pale mint `#C5FFD6`; lime `#ECFFA3` (highlighter tags, CTA on dark); pink `#FFACFE`; blue `rgba(88,130,255,x)` hairlines on dark sections. Light and slate sections alternate.

**Type (computed).**

| Role | Spec |
|---|---|
| H1 | Anybody 700, 96px/96px (`leading-[0.9]`), tracking -2.4px (`tracking-tight`); `lg:text-8xl 3xl:text-9xl` |
| H2 | Anybody 600, 48/48, -1.92px |
| H3 | DM Sans 600, 36/40, -1.44px |
| Body | DM Sans 18/28 (-0.18px) and 16/24 |
| Eyebrow | Space Mono 10px/15px uppercase, **3px tracking**, in brackets: `[ AGENT ]` |
| Label | Space Mono 11px/16.5px uppercase 0.275px; also 10px bold 1.5px |
| Text elements by family | Space Mono **190**, DM Sans 88, Anybody 11, so mono is 66% of text elements |

**Surfaces.** 0 elements with border-radius and 0 with box-shadow (measured over the first 6000 elements). Structure is 1px `dashed rgba(85,83,104,.3)` (21 left-borders) plus 1px solid hairlines for cells.

**Grid furniture (from the DOM).**
- Side rails: `absolute top-0 bottom-0 left-8 border-l border-dashed` (mirrored right), **hidden below `md`**, each ending in a 10x12 hexagon SVG node.
- A 6x6px SVG `pattern` ("grid-left") fills the 32px gutter outside the rail.
- Diagonal hatch `repeating-linear-gradient(-55deg, ink 0 1px, transparent 1px 4px)` frames every figure (24 uses) and fills empty bands between sections.
- Dashed ruler strips: `repeating-linear-gradient(90deg, line 0 6px, transparent 6px 12px)` at `12px 1px`.
- Section dividers carry a small mono tag centred on the rule with a lime or gray highlight (`HOW IT WORKS`, `THREE BUGS THAT SHOULD NOT HIT PROD.`).
- Shell `max-width:1600px`, `px-6 md:px-14 lg:px-16`; hero `min-h-[85vh]` with H1 top-left and sub-copy + CTA pinned bottom-left, empty centre.

**Buttons (stylesheet logic).** `.btn-hex`: `clip-path: polygon(A 0, calc(100% - A) 0, 100% 50%, calc(100% - A) 100%, A 100%, 0 50%)`, `--hex-arrow: 10px`, padding `10px 26px`, DM Sans 14px/-0.01em. The outline variant fakes a 1px border with an `::after` inset 1px using the same polygon minus 0.5px. `.btn-hex-group` overlaps buttons (`margin-left: calc(-1*A + 4px)`) and on hover moves the first -4px and the second +4px over 0.2s. Single button hover: `translateX(4px)` 0.2s. Nav link hover (measured with `hover.js`): background flips to mint, text black, 150ms `cubic-bezier(.4,0,.2,1)`. Screenshot: `renders/greptile-btn-hover.png`.

**Illustration.** The lizard is a static PNG (`/lizard-mobile.png`, 678x716) with CSS `filter: invert(1)` plus three stacked `drop-shadow` glows (lime then mint) in a 6s `ease-in-out infinite` keyframe `lizard-glow`; a tiny fly sprite drifts on `float-sphere 40s linear infinite`. The hero canvas (792x792) and section-header canvases are **`@paper-design/shaders-react` `Dithering`** (found in bundle `f49.js`, call site in `f22.js`): `shape: "wave" | "ripple"`, `type: "4x4" | "8x8"`, `size: 4-7`, `speed: 0-0.15`, `colorBack: "#3D3B4F00"` (transparent), `colorFront` mint. The "How it works" figures are wireframe diagrams; a dotLottie WASM player is in a bundle (`f55.js`), so those are most likely Lottie (inference, not confirmed).

**Motion.** `hero-fade-up 0.6-0.7s ease-out`, `translateY(8px) to 0` (tiny distance). Reveals via Motion `whileInView` with `viewport={{ once: true }}` (17 chunks match; `framer-motion`/`motion-dom` strings in 12). Hovers 150-200ms. Ambient: dithering at speed 0.1-0.15, a marquee band `TEST . RUN . EXECUTE`, a `stamp` keyframe (scale 2 and rotate -15deg to 1 and -5deg, small overshoot). **No Lenis**; the string `gsap` appears twice in one vendor chunk (not used by the page). No parallax, no scroll-jacking.

**Copy voice.** Short declaratives plus proof: "Catch them all", "Your house, your rules", "Unbalanced CUDA release wipes context" (a real bug title from a named repo, with stars and forks), `OVER 22,000+ TEAMS USE GREPTILE`, one mildly profane testimonial. About three sentences per block.

**Brand intent (their words, https://www.greptile.com/blog/brand-refresh, by Ravina Patel, done "entirely in-house").** "Something precise, but not cold." "Not retro for the sake of it." "detailed and precise, but still a little strange in a good way." Bugs are shown as glitches (broken pixels) rather than icons; the logo is "a building block." **Lesson: the visual metaphor is derived from the product** (reptile eye, tiles, glitches). Ours must be too (check paper, microprint, VOID, handset). The agency case study at https://www.pixeluplabs.com/case-studies/greptile lists a different green palette (`#107A4D` family) and does not describe the web motion; treat it as not authoritative for the current site.

### 1.2 Six other references (captured 2026-11-09; `design/<name>-home-*`, contact sheets in `tools04/renders/`)

| Ref | What it is | Measured | Steal | Do not copy |
|---|---|---|---|---|
| **Oxide** (oxide.computer) | Dark hardware/cloud co., mono-first, engineering credibility | GT America Mono (624 text els) + Suisse Intl (230), both commercial. Radii 1-4px, 1px solid oklch-gray borders. Keyframes `flash 0.8s steps(1) infinite`, `marquee 45s linear`, `gentle-ping 2s`. Captions like `FIG. 1  OXIDE CLOUD COMPUTER`. | `FIG.` captions; `steps(1)` blink instead of a smooth pulse; mono as the main voice | Dark-only, paid fonts |
| **Modal** (modal.com) | Dark infra, dot-matrix art in one accent | DM Mono (650 text els) + ABC Diatype (commercial). bg `#181818`, accent `#9BEF87`. 14 canvases. Keyframes `v2-glyph-flash`, `workload-blink steps(1)`, `v2-marquee 120s`. Radii 4-7px, 50px pills. | Single-accent LED-dot illustration; `steps()` for machine state | Pills, 14 canvases |
| **Ramp** (ramp.com), the sponsor | Clean white, Lausanne + IBM Plex Mono | Lausanne (commercial) 342 els; IBM Plex Mono for `10px/22px uppercase .18px` labels. Near-black + neon yellow-lime (`lab(92 -20 85)`, about `#E4F222`). Radii 6-16. Dot-grid hero backdrop and **live counters** ("US CORPORATE PAYMENTS PROCESSED BY RAMP ...", an "AGENTS AT WORK TODAY" ticker). | Mono micro-label above the H1; ticking counters. The audience is Ramp engineers, so mono + Plex Mono reads as familiar | Their yellow, Lausanne. Do not look like a Ramp clone. |
| **Teenage Engineering** | Hardware catalog on black | Custom `te-20`/`te-40` fonts, 9px labels, 4px solid `#272727` borders, dense nav. No canvases, no gradients. | Catalog density, tiny labels, honest object photography | Custom fonts |
| **Are.na** | Text-first, white | One custom grotesk, 12.5-19px, lettered list (a. b. c.), 1px `#EDEDED` hairlines, 3px radii. | Plain-spoken copy as a lettered list; show the real UI | - |
| **Increase** (increase.com), nearest *fintech* analogue | API-first bank | TT Interphases Pro + **Input Mono** + **MRZ Mono** (a passport machine-readable-zone font) for data. Ink `#1D2A36`, mint `#31F2BF`. Keyframes `products-bento-digit-up/down`, `live-pulse`. H2: "Banking for ambitious technology companies. Build great financial products with an API-first bank." | Ledger-style mono for data inside a fintech; **digit-roll animation**; specific, noun-heavy copy ("Bare metal payments on every US rail") | The bright 3D ribbon hero |

Also looked at (earlier captures): **Linear** (Inter Variable + Berkeley Mono; `grid-dot ... upDown 2.8s steps(1)` dots), **Resend** (Commit Mono + a serif display, `scroll-x 180s`), **Railway**/**Cursor** (serif headlines, a 2026 trend we skip because it reads "warm AI startup"). **Rauno** (rauno.me) is 3 SVGs and 0 canvases: one yellow circle and huge plain type; the lesson is restraint and craft in micro-interactions. **Basement** (WebGL game world) and **Mercury** (photographic) do not apply. **Nothing** was blocked by a consent modal.

### 1.3 Why Greptile feels hand-made: the pattern list

1. **Quirky heavy display over light body.** Anybody 700 at -2.4px tracking and 0.9 leading beside DM Sans at normal weight: contrast of personality, not only size.
2. **Mono is the annotation layer.** 10-11px uppercase mono with wide tracking (0.3em on eyebrows, bracket syntax) labels everything, like a technical drawing. 66% of text elements are mono (190 of 289).
3. **Drawn structure, not boxed cards.** 1px dashed rules, side rails, corner nodes. Sections are separated by a rule, not a container with a shadow.
4. **Zero radius, zero shadow, zero gradient** (measured). Depth comes from surface change (fog vs slate) and borders.
5. **Texture from 1px patterns** (hatch, dot grid, ruler ticks, 6px grid), never blur or glow. Every pattern shares one line weight.
6. **One idiosyncratic subject, cropped.** A halftone lizard bleeding off the right edge, treated with a print process and one small animation. Everything else is diagram.
7. **Shape language tied to the logo.** Hex-arrow buttons echo the tile mark; grouped buttons overlap and spread 4px on hover.
8. **Motion is small or discrete.** 8px rises, 150-200ms hovers, 40s drifts, dithering at speed 0.1. No springs, no parallax.
9. **Density of real micro-content.** Star and fork counts, a file path, a diff mock, a real PR title in each cell: the page is full of true-looking specifics.
10. **Poster composition.** H1 top-left, CTA bottom-left, a large empty middle; asymmetry on purpose.
11. **Tiny palette, each color has a job.** Two neutrals, three accents, all flat.
12. **Real UI fragments as illustration** (an actual PR comment, a diff) instead of abstract icons.
13. **Copy voice:** declarative, specific, one joke, no adjectives like "powerful".

---

## 2. Why AI-generated UIs look AI-generated, and the counter-rule for each

Why it happens. Anthropic's own explanation (https://claude.com/resources/articles/improving-frontend-design-through-skills, fetched): "Safe design choices - those that work universally and offend no one - dominate web training data"; and models told to avoid one default settle on another, "such as Space Grotesk". The Tailwind origin story: Adam Wathan's August 2025 post apologising for `bg-indigo-500` on every Tailwind UI button (reported by https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p, fetched; the tweet itself was not linked, so treat as single-source). Tell lists: https://www.925studios.co/blog/ai-slop-design-tells (fetched; its two dates conflict) and the dev.to post. Also seen in search results but not opened: prg.sh, joshuasnoddy.com, thisisabra.com, ohhwells.com, Snyk "Top 8 Claude Skills for UI/UX Engineers".

| # | The tell | Counter-rule for CounterCall | Automated check in `slop-lint.js` |
|---|---|---|---|
| 1 | Indigo/purple or blue-to-purple gradient on hero, buttons, headline text | Hex palette only. `--color-*: initial` wipes Tailwind's colors. Cobalt `#1B4DFF` (hue about 227 deg) is flat, never a gradient. | `no-ai-purple` (hue 250-295 deg), `no-colour-gradients` |
| 2 | Inter / system-ui / Roboto everywhere | Mona Sans + IBM Plex Mono, set in `@theme`. Anthropic: "Use extremes: 100/200 weight vs 800/900, not 400 vs 600." We use 800 display vs 400 body. | `no-slop-primary-font` |
| 3 | `rounded-xl/2xl` cards with soft shadows | 0 radius, no shadows. Elevation = hairline + surface step. | `radius<=3%`, `no-box-shadows` |
| 4 | Glassmorphism: translucent blurred panels | Solid surfaces only; `backdrop-filter` banned. | `no-glassmorphism` |
| 5 | Centered hero: gradient H1, subtitle, two buttons, logo row | Left-aligned poster composition; the **product scene is the hero visual**, not a decorative blob. | `h1-not-centered` |
| 6 | Three equal feature cards, each with a rounded icon | Four ruled steps with different internal diagrams, pixel glyphs not Lucide, uneven content. | `no-three-icon-cards` |
| 7 | Lucide/Heroicons thin-line icons on every item | No icon library on the landing page. Pixel glyphs from ASCII bitmaps and typographic arrows. (App: agent 05 hand-writes 12px SVGs, butt caps, miter joins.) | `no-lucide`, `small-svg-icons<=14` |
| 8 | Emoji bullets, rocket, sparkles | None. Status uses drawn glyph shapes in chips. | `no-emoji` |
| 9 | Shimmer badges ("New"), animated gradient borders, glowing orbs, mesh blobs | Flat chips. No glow anywhere. Texture only from 1px patterns and halftone. | `no-colour-gradients` |
| 10 | Everything fades up 0.5s with the same stagger on scroll | Three scripted moments (load, hero scene, stamp) plus a few mechanically different reveals (type-in, draw, count). 8px max travel. | manual (rubric R9) |
| 11 | Copy: "Supercharge", "Unlock", "Seamless", "AI-powered", "Ship faster", triplets | Ban list; every sentence names a noun an AP clerk uses (invoice, vendor, bank account, wire, callback). Numbers over adjectives. | `no-banned-phrases` |
| 12 | Stock-like abstract hero art (3D blob, mesh gradient) | A real artifact: halftone handset, actual call transcript, actual bill row. | manual (R7) |
| 13 | Perfect symmetry and uniform spacing, no imperfection | Deliberate crop, cobalt misregistration on the halftone, stamp overshoot rotated -4 deg, asymmetric 7/5 grid. | manual (R8) |
| 14 | Neon-on-near-black "glow grid" dark mode as the default | Light paper default; `.night` for contrast moments only. | manual |
| 15 | Library-default component look (shadcn card/muted/accent with Inter) | Theme wiped and re-mapped (section 7 gives the shadcn token map). | `radius`, `no-box-shadows` |

Calibration: running the lint against greptile.com yields 5 FAILs (88 small SVGs from the logo wall, "seamlessly" in one line, one emoji, one 3-equal-card block, one multi-color gradient). It is a tripwire for the common failure, not a judge of taste. The small-svg check was downgraded to WARN after that run.

---

## 3. CounterCall identity: "Safety paper and signal"

### 3.1 Concept

Greptile derived its look from its product. CounterCall's product is: **a forged document (an email) is checked against a trusted record (a phone line).** That maps to a real print genre, **bank-check security**: safety paper, microprint rules, the VOID pantograph, registration marks, serial numbers. And a real object: the handset.

Keep Greptile's grammar (the team asked for it): dashed rails, mono micro-labels, zero radius, halftone art, chamfered buttons, dense cells. Change every concrete motif so nothing is copy-paste:

| Greptile | CounterCall |
|---|---|
| Cool fog `#E9E9E9`, indigo slate, mint, lime, pink | Warm safety paper `#E9E6DE`, cool ink `#14161D`, one cobalt `#1B4DFF` |
| Hexagon nodes on rails | `+` registration marks at rail/rule crossings (print crop-mark language) |
| Hex-arrow buttons | 45-degree **chamfer** (top-left and bottom-right) buttons and tags |
| `-55deg` hatch frames | Hatch only for "frozen / inactive" fills (`--hatch`); **microprint text rules** as dividers |
| `[ AGENT ]` bracket eyebrows | `No. 02 - THE CALL` serial-number eyebrows and `FIG. 01` captions |
| Black-white halftone lizard with glow | **Two-ink riso halftone handset** (ink + cobalt, misregistered 3px), no glow |
| Hex tile logo | Chamfered square mark |
| `stamp` keyframe nobody sees | A **BLOCKED** rubber stamp that lands on the money: the product's payoff |

Rules that apply everywhere: flat color only; 1px lines only (2px is reserved for focus rings); no shadows, blur, glow or gradients; every accent has exactly one job.

**Frame ticks, a decision for the architect.** Agent 05 assumed Greptile's diamond corner ticks on its `<Frame>`. For a distinct identity use the `+` registration tick (9-11px, 1px lines, `currentColor`) instead; it is a 5-minute change inside `<Frame>`. The `shell` utility in 3.9 already draws `+` marks.

### 3.2 Wordmark

- Text: `CounterCall`, one word, Mona Sans, `font-stretch: 112%`, tracking -0.03em. **Counter** at weight 500, **Call** at weight 850 (the product's job is the call; "counter" qualifies it).
- Mark: a square with 45-degree chamfers (top-left and bottom-right), the same `--cut` geometry as buttons, filled `signal` cobalt. Height = cap height, gap = 0.5em. Footer variant is mono: `COUNTERCALL` in Plex Mono 600, 0.14em tracking.
- Favicon / app icon: the chamfered cobalt square at 32x32 with a paper-colored "C" in Mona Sans 800. OG image: the hero scene at stage 4 on paper.
- Clear space: one mark-width. Never on a photo; never gradient or outline versions.
- `renders/specimen-hero.png` shows the nav lockup in a single weight; apply the 500/850 split when building the component.

### 3.3 Palette (hex tokens)

Contrast computed with the WCAG formula (`tools04/contrast.py`); AA body text needs 4.5.

| Token | Hex | Role | Contrast / note |
|---|---|---|---|
| `paper` | `#E9E6DE` | Page background | ink on paper 14.5:1 |
| `paper-raised` | `#F4F2EC` | Panels, figure frames, table header | |
| `paper-sunk` | `#DCD8CE` | Inactive / chip default | |
| `ink` | `#14161D` | Text, borders, primary button | |
| `ink-2` | `#2B2F3B` | Lead paragraphs | |
| `ink-muted` | `#5C6170` | Secondary text, labels | 4.95:1 on paper |
| `ink-faint` | `#8A8E9C` | Decorative only | 3.2:1 on paper: never for text a user must read |
| `night` / `night-raised` / `night-sunk` | `#12141A` / `#1B1E27` / `#0C0D12` | Dark sections (`.night`) | |
| `chalk` / `chalk-muted` | `#ECE9E1` / `#A9A79F` | Text on night | muted on ink 7.5:1 |
| `signal` | `#1B4DFF` | Brand accent, primary CTA, **CALLING** | 4.74:1 on paper; white on it 5.9:1 |
| `signal-ink` | `#1743E0` | Signal as small text on paper | 5.78:1 |
| `signal-soft` | `#7C9BFF` | Signal as text on night | 6.87:1 |
| `hilite` | `#F7E26B` | Marker-pen highlight | |

**Status roles (the app needs these; fills and dots, never body text).**

| Status | Fill | Text on fill | Glyph (shape, so color is not the only cue) | Meaning |
|---|---|---|---|---|
| **HELD** | `#FFB81C` amber | ink (10.4:1) | two pause bars | Payment frozen, awaiting the call. Pair with the `--hatch` pattern on the money row. |
| **CALLING** | `#1B4DFF` cobalt | white (5.9:1) | pulsing square (1.6s) | Live call in progress |
| **VERIFIED** | `#22B866` green | ink (7.0:1) | check | Vendor confirmed; policy may now consider release |
| **FRAUD / BLOCKED** | `#D42A14` vermilion | paper-raised (4.5:1) | x | Vendor denied, email flagged |
| **NEEDS_REVIEW** | `#EE6DB8` pink | ink (6.5:1) | triangle | No answer or unclear answer; human task opened |

Why these hues: cobalt = "live line", so the brand accent and CALLING are deliberately the same (a call in progress is the brand's one moving thing). Amber is the universal "paused". Pink for review sits far from red so a hurried AP clerk never confuses "needs a human" with "fraud", and it is nowhere near the purple that signals "AI". Row tint = status color at 8-15% (`bg-blocked/10`); selected rows in the app get a 2px solid left border in the status color. On dark (`.night`) all five fills keep their hex; their ink/paper text pairs stay valid.

**Agent 05's role names map to ours** (aliases already exist in `globals.css`, so `bg-accent`, `border-hairline`, `bg-inverse-bg`, `bg-warn` etc. compile):

| 05 role | Ours | 05 role | Ours |
|---|---|---|---|
| `paper`, `paper-raised`, `ink`, `ink-muted`, `ink-faint` | same names | `hairline` | `--rule` (28% ink, dashed) |
| `rule-strong` | `--fg` (solid 1px) | `focus-ring` | `signal`, 2px solid, offset 2 |
| `inverse-bg/ink/muted` | `#12141A / #ECE9E1 / #A9A79F` (the call card only) | `accent`, `accent-ink` | `signal`, `signal-ink` (live / go) |
| `evidence` ("what they ask") | `hilite #F7E26B` | `evidence-strong` ("who / where money goes") | review pink `#EE6DB8` |
| `danger` | `blocked #D42A14` | `warn` | `held #FFB81C` |
| `--hatch` (45 deg, 1px, 6px pitch, 55%) | defined, `hatch` utility | `--d-instant/fast/base/slow/stamp/settle`, `--beat-gap` | 80/120/200/400/220/600 ms, 700 ms |

One difference to resolve: 05's single `accent` meant "live/go/verified" (mint in Greptile). Ours splits it: `accent` = cobalt = live and primary action; **verified is green** (`--color-verified`). The chip component carries both.

### 3.4 Type system

| Family | Use | Source and license | Files and size (latin, woff2) |
|---|---|---|---|
| **Mona Sans** (variable: wght 200-900, wdth 75-125) | Display (wdth 112, wght 800, tracking -0.035em, leading 0.9), body (wdth 100, wght 400) | GitHub's Mona Sans. SIL OFL 1.1 (`github.com/github/mona-sans`, GitHub API license check = OFL-1.1). On Google Fonts and as `@fontsource-variable/mona-sans` 5.3.0 (OFL-1.1, npm). | `mona-sans-latin-wdth-normal.woff2` **98 KB** (measured). The weight-only file is 40 KB but loses the width axis. `pyftsubset` could roughly halve it (not done). |
| **IBM Plex Mono** (400, 500, 600) | Micro-labels, data, tables, code, transcript | IBM. SIL OFL 1.1. `@fontsource/ibm-plex-mono` 5.3.0 (OFL-1.1, npm). | 3 x about 15 KB (measured 14.7, 14.9, 15.6) |

Total about 143 KB for the site; preload only the Mona file.

Why not the obvious alternatives: Greptile's own trio (Anybody + DM Sans + Space Mono, all OFL) would be a copy. Inter, Roboto and Arial are the named defaults; Space Grotesk is what models settle on after being told to avoid Inter (Anthropic article). Berkeley Mono (Linear) and GT America Mono (Oxide) are paid. Alternates if Mona disappoints: Archivo (wdth 62-125), Hubot Sans (same GitHub family and axes), and for mono Martian Mono (wdth 75-112.5, OFL-1.1 by GitHub API check) or Azeret Mono. All on Google Fonts (axes read from `fonts.google.com/metadata/fonts`).

Scale (set in `@theme`; Tailwind class in brackets):

| Role | Spec |
|---|---|
| Display XL (CTA, full-width headline) | `text-display-xl` = clamp(3.5rem, 9.5vw, 8.5rem)/0.88. **In the 7/5 split hero use** `text-[clamp(3rem,6.4vw,6.5rem)]` (display-xl wrapped to 5 lines in 7 columns; TESTED). Utility `display` adds width/weight/tracking. |
| Display LG (H2) | clamp(2.5rem, 5.5vw, 4.75rem)/0.95 |
| Display MD (H3, pull quotes) | clamp(1.75rem, 3vw, 2.5rem)/1 |
| Lead | 20/28, wght 400, `text-ink-2`, max 34ch |
| Body | 17/26 (set on `body`), `text-wrap: pretty`. App uses 15/24 (agent 05). |
| Label (`label`) | Plex Mono 500, 11/16, uppercase, +0.14em (13/18 under `data-scale="video"`) |
| Data | Plex Mono 400/500, 13/20, `tabular-nums` |
| Big numerals | Plex Mono 500, clamp(3rem, 6vw, 5rem)/1, `tnum` |

Eyebrow pattern: `[6px cobalt square] VENDOR BANK-CHANGE FRAUD / ACCOUNTS PAYABLE` or `No. 02 - THE CALL`. Figure caption: `FIG. 01 / LIVE INTERCEPT`. (The "No." renders as the single glyph "№" if the font has it; Plex Mono did in the specimen.)

### 3.5 Grid, spacing, borders, iconography

- **Shell:** `max-w-[1440px]`, `px-6` mobile, `md:px-10`, `lg:px-16`; sections `py-16` mobile, `py-24` desktop. Spacing is Tailwind's 4px base; layout steps are multiples of 8.
- **Columns:** 12-col; hero 7/5; how-it-works 4 equal ruled cells; trust anchor 5/2/5.
- **Rails:** dashed rails at 32px (`--rail`), desktop only (hidden under 768px). `+` marks (11px, 1px lines) at rail/top-rule crossings, drawn by the `shell` utility.
- **Rules:** structure = `1px dashed var(--rule)`; objects (figure frames, tables, inputs, popovers) = `1px solid var(--fg)`; stat/logo cells = `1px solid var(--rule)`. 2px only for the focus ring.
- **Elevation:** none. Surface step (`paper` to `paper-raised`) plus a hard border. No shadows.
- **Patterns (1px only):** dot grid 24px (`dot-grid`), `--hatch` (45 deg, 1px, 6px pitch; "frozen" state, survives greyscale and video compression), microprint rule (`microprint`: 6px mono text "CALL THE NUMBER ON FILE . NEVER THE NUMBER IN THE EMAIL ."), registration marks.
- **Chamfer:** `--cut: 10px` (buttons), 7px (small buttons), 5px (chips, logo mark).
- **Icons:** none from libraries on the landing page. Four **pixel glyphs** from ASCII bitmaps rendered as SVG `rect`s with `crispEdges` (TESTED, `renders/pixel-glyphs.png`). Typographic arrows are the literal `→`. In the app, agent 05 hand-writes 12px SVG icons (butt caps, miter joins); same rule, no icon library.

```tsx
// components/PixelGlyph.tsx  (mail, lock, stamp TESTED in the render; the first "phone" bitmap did not read, so it is redrawn below, UNTESTED: tune by eye)
const G = {
  mail:  ["###########","##.......##","#.#.....#.#","#..#...#..#","#...#.#...#","#....#....#","#.........#","###########"],
  lock:  ["..#####..",".#.....#.",".#.....#.",".#.....#.","#########","#########","####.####","####.####","#########","#########"],
  stamp: ["....#####....","...#######...","...#######...","....#####....",".....###.....","#############","#############",".###########."],
  phone: [".#################.","###################","#####.........#####","#####.........#####",".####.........####.","..##...........##.."], // handset as an arch with feet
} as const;
export function PixelGlyph({ name, unit = 6 }: { name: keyof typeof G; unit?: number }) {
  const rows = G[name], w = rows[0].length, h = rows.length;
  return (
    <svg width={w * unit} height={h * unit} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}
```

### 3.6 Illustration: the halftone handset (concept, pipeline, commands)

**Concept.** One cropped hero object, like Greptile's lizard: a vintage handset (the "call" half of the name), printed as a two-ink riso halftone (ink dots at 45 deg, cobalt dots at 15 deg, offset 3px so it looks mis-registered on purpose). It appears at the right edge of the hero (cropped by the viewport, behind the scene panel), once large in the trust-anchor section, and in chalk ink on the CTA. No glow. The only optional animation: the cobalt layer drifts 3px to 0 on hover.

**Step 1: a clean base image.** Needs: grayscale, one hard key light, strong shadows, plain white background, object isolated. Two routes:

- **Route A (preferred, no AI-look risk): a public-domain photograph.** Smithsonian Open Access (https://www.si.edu/openaccess, CC0 where marked) and Wikimedia Commons "Telephones" hold many desk-phone and handset photos. I queried the Smithsonian API (`api.si.edu/openaccess/api/v1.0/search`, DEMO_KEY): it returned records (Bell model 500, Western Electric 102 and 305 desk telephones) but my parse found no media URLs. **Pick the image on the website and check its rights field. UNVERIFIED which image.**
- **Route B: an image model.** `fal-ai/nano-banana-pro` (verified on https://fal.ai/models/fal-ai/nano-banana-pro: "$0.15 per image", 4K at double; `aspect_ratio` and `resolution` 1K/2K/4K confirmed; transparent background not mentioned, so use white and let the script drop it). `ecc:fal-ai-media` also lists `fal-ai/nano-banana-2` (cheaper, for iteration). Agent 07 owns AI-media choices; this is one still.

Exact prompt (Route B):

```
Studio product photograph of a single vintage black Bakelite telephone handset (Western Electric 500 style), floating in mid-air, three-quarter view from slightly above, earpiece cup on the left and mouthpiece cup on the right, no cord, no cradle, no base. One hard key light from the upper left, deep raking shadows, crisp specular highlights along the curved handle, visible surface wear on the edges. Pure white seamless background (#FFFFFF), no floor shadow, no reflection, no text, no logos. Monochrome grayscale, high contrast, sharp focus, large-format film look. The handset fills 80 percent of the frame width.
```

```bash
# FAL_KEY in env. Response shape per fal convention (images[0].url): verify on the first call.
curl -s https://fal.run/fal-ai/nano-banana-pro -H "Authorization: Key $FAL_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"<paste prompt above>","aspect_ratio":"4:3","resolution":"2K"}' | tee /tmp/fal.json
curl -sL "$(python3 -c "import json;print(json.load(open('/tmp/fal.json'))['images'][0]['url'])")" -o art/handset-base.png
```

Generate 4-6 and keep the strongest silhouette; reject any with a cord, a base, or a glossy "3D render" feel.

**Step 2: halftone it in code.** `tools04/halftone.py` (below) ran end-to-end on a synthetic lit handset (a stand-in; no image model was called here): 1400x1000 in about 3s, **73 KB** as a 16-color PNG-8 (the same image was 435 KB as RGBA PNG and 220 KB as lossless WebP). Output is a transparent PNG, so it sits on any surface. Render: `renders/halftone-two-ink.png`. My first run had a bug (colors not scaled to 0-1, dots rendered white); the shipped file has the fix.

```bash
python3 -m venv .venv && .venv/bin/pip install pillow numpy
mkdir -p art public/art
.venv/bin/python tools/halftone.py art/handset-base.png public/art/handset.png        --cell 8 --angle 45 --width 1600 --gamma 0.8 --lo 0.04 --hi 0.92
.venv/bin/python tools/halftone.py art/handset-base.png public/art/handset-night.png  --cell 8 --ink '#ECE9E1' --spot '#7C9BFF' --width 1600   # for .night sections
.venv/bin/python tools/halftone.py art/handset-base.png public/art/handset-1ink.png   --cell 6 --no-spot --width 1600                           # single-ink variant
```

Tuning: `--cell` 6-10 (bigger = more graphic), `--gamma` lower = darker mids, `--lo/--hi` set black and white points (raise `--hi` toward 0.97 if the model's "white" has a gray cast and dots appear on it), `--spot-offset` 3-4px for the misregistration.

```python
#!/usr/bin/env python3
"""halftone.py in.png out.png [--cell 7] [--angle 45] [--ink '#14161D'] [--spot '#1B4DFF'] [--spot-offset 3] [--gamma 0.85] [--ss 3] [--width 1600] [--colors 16] [--no-spot] [--lo 0.04] [--hi 0.92]
Two-ink riso-style halftone: ink dots (45 deg) over an offset spot-colour layer (15 deg). White or transparent areas stay empty (transparent PNG out)."""
import argparse, math, numpy as np
from PIL import Image

def hexrgb(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255

def layer(dark, cell, angle, k, ss):
    """dark: HxW float 0..1 at output res. returns HxW coverage 0..1 (supersampled by ss)."""
    H, W = dark.shape; Hs, Ws = H * ss, W * ss
    ys, xs = np.mgrid[0:Hs, 0:Ws].astype(np.float32); xs /= ss; ys /= ss
    a = math.radians(angle); c, s = math.cos(a), math.sin(a)
    u = xs * c + ys * s; v = -xs * s + ys * c                       # rotate into screen space
    cu = (np.floor(u / cell) + .5) * cell; cv = (np.floor(v / cell) + .5) * cell
    cx = cu * c - cv * s; cy = cu * s + cv * c                       # cell centre back in image space
    d = np.clip(dark[np.clip(cy.astype(int), 0, H - 1), np.clip(cx.astype(int), 0, W - 1)], 0, 1)
    r = cell * 0.5 * k * np.sqrt(d)                                  # dot radius ~ sqrt(darkness) -> area ~ darkness
    dist = np.hypot(xs - cx, ys - cy)
    cov = np.clip((r - dist) * ss + .5, 0, 1)                        # 1px-wide AA at supersampled res
    return cov.reshape(H, ss, W, ss).mean(axis=(1, 3)) if ss > 1 else cov

def main():
    p = argparse.ArgumentParser(); p.add_argument('inp'); p.add_argument('out')
    p.add_argument('--cell', type=float, default=7); p.add_argument('--angle', type=float, default=45)
    p.add_argument('--ink', default='#14161D'); p.add_argument('--spot', default='#1B4DFF'); p.add_argument('--spot-offset', type=float, default=3)
    p.add_argument('--gamma', type=float, default=0.85); p.add_argument('--ss', type=int, default=3); p.add_argument('--width', type=int, default=1600)
    p.add_argument('--no-spot', action='store_true'); p.add_argument('--lo', type=float, default=0.04, help='luminance mapped to full ink'); p.add_argument('--hi', type=float, default=0.92, help='luminance mapped to no ink (kills off-white backgrounds from image models)'); p.add_argument('--colors', type=int, default=16, help='palette size for PNG-8 output (0 = keep RGBA)')
    a = p.parse_args()
    im = Image.open(a.inp).convert('RGBA')
    if im.width > a.width: im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
    arr = np.asarray(im, dtype=np.float32) / 255
    lum = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    lum = np.clip((lum - a.lo) / (a.hi - a.lo), 0, 1)
    dark = ((1 - lum) ** a.gamma) * arr[..., 3]                      # transparent or white -> no dots
    H, W = dark.shape
    ink = layer(dark, a.cell, a.angle, 1.18, a.ss)
    out = np.zeros((H, W, 4), np.float32)
    if not a.no_spot:                                                # spot layer: lighter tones only, other angle, shifted
        o = int(round(a.spot_offset)); sh = np.roll(np.roll(dark, o, 0), o, 1)
        spot = layer(np.clip(sh * 0.75, 0, 1) ** 1.3, a.cell * 1.15, a.angle - 30, 1.05, a.ss)
        sc = hexrgb(a.spot); out[..., :3] = sc; out[..., 3] = spot
    ic = hexrgb(a.ink); al = ink
    out[..., :3] = np.where(al[..., None] > 0, (ic * al[..., None] + out[..., :3] * out[..., 3:4] * (1 - al[..., None])) / np.maximum(al[..., None] + out[..., 3:4] * (1 - al[..., None]), 1e-6), out[..., :3])
    out[..., 3] = al + out[..., 3] * (1 - al)
    img = Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA')
    if a.colors: img = img.quantize(colors=a.colors, method=Image.Quantize.FASTOCTREE)   # ~6x smaller, dots are two flat inks
    img.save(a.out, optimize=True)
    print(a.out, im.size, 'dots cell', a.cell)

if __name__ == '__main__': main()
```

Alternatives if the script is not wanted: (1) **Paper Shaders `HalftoneDots`** takes an `image` and renders live in WebGL. Props from the source (verified): `image, colorBack, colorFront, size, radius, contrast, grid ('square'|'hex'), type ('classic'|'gooey'|'holes'|'soft'), originalColors, inverted, grainMixer, grainOverlay, grainSize`, e.g. `<HalftoneDots image="/art/handset-base.png" colorBack="#E9E6DE" colorFront="#14161D" size={0.5} radius={1.25} contrast={0.4} grid="hex" type="classic" />`. Costs more at runtime and gives less control than a baked PNG. (2) ImageMagick: `magick in.png -colorspace Gray -ordered-dither h8x8a out.png` (1-bit, 45 deg halftone; **UNVERIFIED, ImageMagick is not installed on this box**).

**Ambient texture (one place only): Paper Shaders `Dithering`**, the same component Greptile uses. Props verified from `dithering.tsx`: `shape` ('sphere' | 'wave' | 'dots' | 'ripple' | 'swirl' | 'warp' | 'simplex'), `type` ('random' | '2x2' | '4x4' | '8x8'), `size`, `scale`, `speed`, `colorBack`, `colorFront`. In the CTA: `<Dithering style={{width:"100%",height:"100%"}} colorBack="#12141A00" colorFront="#7C9BFF" shape="wave" type="8x8" size={5} speed={0.12} scale={1.2} />`, loaded with `next/dynamic(..., { ssr: false })` after idle, `speed={0}` under reduced motion. Apache-2.0; the maintainers say to **pin the exact version** (0.0.x ships breaking changes): 0.0.82.

### 3.7 Motion principles

The `motion-foundations` rule we keep: motion must **guide attention, communicate state, or preserve continuity**, otherwise it is removed. Emil Kowalski's UI-animation standards (https://github.com/emilkowalski/skills, via search results, not opened in full): keep UI animation under 300ms, never ease-in for UI, use a strong custom ease-out such as `cubic-bezier(0.23, 1, 0.32, 1)`, about 0.97 scale on `:active`, and animate little or nothing for things seen hundreds of times a day. We adopted that curve as `--ease-out`.

| Token | Value | Used for |
|---|---|---|
| `--d-fast` | 120ms | hover color flips, chip state, press |
| `--d-base` | 200ms | arrow nudge, tab switch, tooltip |
| `--d-slow` | 400ms | row reveals in the hero scene |
| `--d-settle` | 600-700ms | page-load rise (8px), section reveal |
| `--d-stamp` | 220ms | the BLOCKED stamp |
| Loop | 13.4s | hero scene |
| Ambient | >= 40s | marquee 120s, dithering speed 0.12 |
| Ease | `--ease-out` | entrances; `steps(1)` for blinks and state flips; `linear` for type-in and marquee; `--ease-in` exits only |
| Distance | <= 8px | any translate; the stamp is the only scale (1.5 to 1, rotate -8 to -4 deg) |

What moves and why: (1) H1 words rise 8px once on load (hierarchy); (2) the hero scene tells the product story (attention + state); (3) hover: arrow +4px and a color flip (affordance); (4) stat numerals count up once when scrolled in (NumberFlow, 900ms); (5) transcript lines type in at about 25ms/char with a `steps(1)` caret (liveness); (6) the BLOCKED stamp (payoff); (7) the CALLING chip pulses (the only perpetual UI motion). **Forbidden:** springs and bounce, parallax, scroll-jacking, smooth-scroll libraries, floating blobs, gradient shimmer, fade-up on every element, `transition: all`, glow. Reduced motion: the hero scene renders its final frame, loops stop, shaders get `speed=0`, reveals become instant (the base layer in `globals.css` also zeroes durations).

### 3.8 Voice and copy rules

- Name the real objects: invoice, vendor, bank account, wire, callback, number on file, hold, release.
- Numbers and proof over adjectives; each stat carries a source line.
- Present tense, active verbs, at most 3 sentences per block, no triplets for rhythm.
- One dry line per page (the pitch's "Let's stop paying scammers.").
- Banned (the lint enforces): supercharge, unlock, seamless, revolutionize, elevate, empower, next-gen, cutting-edge, AI-powered, streamline, leverage, game-changing, effortless, "in today's", harness the power, ship faster, build faster.
- Be honest about demo data: label synthetic data as synthetic.

### 3.9 Paste-ready Tailwind v4 `@theme` + `globals.css`

TESTED: compiles under Tailwind 4.3.3 (4.3.5 is current on npm, same minor line) and renders as in `renders/specimen-hero.png`. Source file: `tools04/globals.css`. Two things I learned the hard way:

1. **`@theme inline` is what lets a `.night` ancestor flip colors.** Without `inline`, the semantic vars resolve at `:root` and the dark section stays light (my first render). Component CSS therefore reads `var(--surface)` etc. directly, never `var(--color-surface)`.
2. `--color-*: initial` also removes `white`/`black`, on purpose; use `paper-raised`/`ink`. If shadcn components expect them, see the token map in section 7.

```css
@import "tailwindcss";

/* Fonts (both SIL OFL 1.1). Tested path: import the fontsource CSS once in app/layout.tsx
     import "@fontsource-variable/mona-sans/wdth.css";   // family "Mona Sans Variable" (wght 200-900, wdth 75-125)
     import "@fontsource/ibm-plex-mono/400.css"; import "@fontsource/ibm-plex-mono/500.css"; import "@fontsource/ibm-plex-mono/600.css";
   Lower-CLS path: next/font/local with --font-mona / --font-plex variables (see report section 4); the var() fallbacks below cover both. */

@theme {
  /* Wipe Tailwind defaults that produce generic output. bg-indigo-500 / rounded-xl / shadow-lg will not compile. */
  --color-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --inset-shadow-*: initial;
  --drop-shadow-*: initial;
  --font-*: initial;

  /* Raw palette: warm safety-paper, cool near-black ink, one cobalt */
  --color-paper: #E9E6DE;
  --color-paper-raised: #F4F2EC;
  --color-paper-sunk: #DCD8CE;
  --color-ink: #14161D;
  --color-ink-2: #2B2F3B;
  --color-ink-muted: #5C6170;
  --color-night: #12141A;
  --color-night-raised: #1B1E27;
  --color-night-sunk: #0C0D12;
  --color-chalk: #ECE9E1;
  --color-chalk-muted: #A9A79F;
  --color-signal: #1B4DFF;       /* brand accent AND the CALLING status. Flat only. Never a gradient. */
  --color-signal-ink: #1743E0;   /* signal as small text on paper (5.8:1) */
  --color-signal-soft: #7C9BFF;  /* signal as text on night (6.9:1) */
  --color-hilite: #F7E26B;       /* marker-pen label highlight, marketing only */

  /* Role aliases requested by agent 05 (research/05-app-ui.md Hand-offs). Same hexes as above, app-facing names. */
  --color-ink-faint: #8A8E9C;          /* decorative only (3.2:1 on paper), never for text a user must read */
  --color-accent: #1B4DFF;             /* = signal: live / primary action. Verified is separate (--color-verified). */
  --color-accent-ink: #1743E0;
  --color-evidence: #F7E26B;           /* = hilite: highlighter for "what they ask" */
  --color-evidence-strong: #EE6DB8;    /* = review pink: highlighter for "who / where the money goes" */
  --color-danger: #D42A14;             /* = blocked */
  --color-warn: #FFB81C;               /* = held amber: unverified, voicemail, no answer */
  --color-inverse-bg: #12141A;         /* the one dark surface in the app: the live call card */
  --color-inverse-ink: #ECE9E1;
  --color-inverse-muted: #A9A79F;

  /* Status roles (fills and dots; ink text on held/verified/review, paper text on blocked/calling) */
  --color-held: #FFB81C;
  --color-calling: #1B4DFF;
  --color-verified: #22B866;
  --color-blocked: #D42A14;
  --color-review: #EE6DB8;

  /* Type */
  --font-display: var(--font-mona, "Mona Sans Variable"), "Mona Sans", ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-mona, "Mona Sans Variable"), "Mona Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex, "IBM Plex Mono"), ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --text-micro: 0.6875rem;               /* 11px mono labels */
  --text-micro--line-height: 1rem;
  --text-display-xl: clamp(3.5rem, 9.5vw, 8.5rem);
  --text-display-xl--line-height: 0.88;
  --text-display-lg: clamp(2.5rem, 5.5vw, 4.75rem);
  --text-display-lg--line-height: 0.95;
  --text-display-md: clamp(1.75rem, 3vw, 2.5rem);
  --text-display-md--line-height: 1;
  --tracking-label: 0.14em;
  --tracking-display: -0.035em;

  /* Motion: strong ease-out for entrances, steps() for machine readouts. No springs, no bounce. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-snap: cubic-bezier(0.2, 0, 0, 1);
  --ease-in: cubic-bezier(0.64, 0, 0.78, 0);   /* exits only; never for entrances */
  --animate-rise: rise 600ms var(--ease-out) both;
  --animate-blink: blink 1s steps(1) infinite;
  --animate-ping-dot: ping-dot 1.6s var(--ease-out) infinite;
  --animate-marquee: marquee 120s linear infinite;
  --animate-draw: draw 900ms var(--ease-out) both;
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes ping-dot { 0% { transform: scale(1); opacity: .7; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
  @keyframes marquee { to { transform: translateX(-50%); } }
  @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

  --breakpoint-3xl: 100rem;
}

/* Semantic roles. `inline` makes utilities read var(--surface) at the element, so a .night ancestor flips the subtree. */
@theme inline {
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-surface-sunk: var(--surface-sunk);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-rule: var(--rule);
  --color-link: var(--link);
  --color-hairline: var(--rule);        /* agent 05: dashed frame border */
  --color-rule-strong: var(--fg);       /* agent 05: solid 1px for selected / active */
  --color-focus-ring: var(--color-signal);
}

:root {
  --surface: #E9E6DE;
  --surface-raised: #F4F2EC;
  --surface-sunk: #DCD8CE;
  --fg: #14161D;
  --fg-muted: #5C6170;
  --rule: rgb(20 22 29 / 0.28);
  --link: #1743E0;
  --rail: 2rem;                  /* inset of the dashed side rails */
  --cut: 10px;                   /* chamfer size for buttons and tags */
  --hatch: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--fg) 55%, transparent) 0 1px, transparent 1px 6px);  /* "frozen": a pattern, so it survives greyscale and video compression */
  /* motion tokens in agent 05's names (durations); easings are --ease-* in @theme */
  --d-instant: 80ms; --d-fast: 120ms; --d-base: 200ms; --d-slow: 400ms; --d-stamp: 220ms; --d-settle: 600ms; --beat-gap: 700ms;
}
/* Recording / projector mode: <html data-scale="video"> lifts the 11px micro size to 13px (agent 06 records with a 13px minimum). */
[data-scale="video"] { --text-micro: 0.8125rem; --text-micro--line-height: 1.125rem; }
.night {
  --surface: #12141A;
  --surface-raised: #1B1E27;
  --surface-sunk: #0C0D12;
  --fg: #ECE9E1;
  --fg-muted: #A9A79F;
  --rule: rgb(236 233 225 / 0.28);
  --link: #7C9BFF;
}

@layer base {
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-size-adjust: 100%; }
  body { background: var(--surface); color: var(--fg); font-family: var(--font-sans); font-size: 1.0625rem; line-height: 1.5; font-stretch: 100%; }
  ::selection { background: var(--color-signal); color: var(--color-paper-raised); }
  :focus-visible { outline: 2px solid var(--color-signal); outline-offset: 2px; }
  h1, h2, h3 { text-wrap: balance; }
  p { text-wrap: pretty; }
  table, .tnum { font-variant-numeric: tabular-nums; }
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  }
}

/* ---------- Typography utilities ---------- */
@utility display {
  font-family: var(--font-display);
  font-stretch: 112%;
  font-weight: 800;
  letter-spacing: var(--tracking-display);
  line-height: 0.9;
}
@utility label {  /* mono micro-label: the single most Greptile-like detail */
  font-family: var(--font-mono);
  font-size: var(--text-micro);
  line-height: 1rem;
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

/* ---------- Grid furniture ---------- */
/* .shell: a full-bleed section with dashed top rule, dashed side rails and + registration marks at the rail/rule crossings */
@utility shell {
  position: relative;
  border-top: 1px dashed var(--rule);
  &::before {   /* side rails */
    content: ""; position: absolute; inset: 0 var(--rail); pointer-events: none;
    border-inline: 1px dashed var(--rule);
  }
  &::after {    /* + marks, 11px, centred on the rail/top-rule crossings */
    content: ""; position: absolute; left: 0; right: 0; top: -6px; height: 11px; pointer-events: none; color: var(--fg);
    background:
      linear-gradient(currentColor, currentColor) left calc(var(--rail) - 0.5px) top 0 / 1px 11px no-repeat,
      linear-gradient(currentColor, currentColor) left calc(var(--rail) - 5px) top 5px / 11px 1px no-repeat,
      linear-gradient(currentColor, currentColor) right calc(var(--rail) - 0.5px) top 0 / 1px 11px no-repeat,
      linear-gradient(currentColor, currentColor) right calc(var(--rail) - 5px) top 5px / 11px 1px no-repeat;
  }
  @media (max-width: 767px) { &::before, &::after { display: none; } }   /* rails are desktop furniture */
}
@utility rule-b { border-bottom: 1px dashed var(--rule); }
@utility rule-t { border-top: 1px dashed var(--rule); }
@utility rule-r { border-right: 1px dashed var(--rule); }
@utility cell { border: 1px solid var(--rule); }       /* solid hairline cells for stat / logo grids */
@utility dot-grid {
  background-image: radial-gradient(circle, color-mix(in oklab, var(--fg) 18%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
}
@utility hatch {     /* diagonal hatching for frozen / inactive fills (token --hatch, agent 05's 45deg 1px / 6px pitch) */
  background-image: var(--hatch);
}
@utility microprint { /* check-security rule: put tiny repeated text inside, e.g. "CALL THE NUMBER ON FILE · " */
  font-family: var(--font-mono); font-size: 6px; line-height: 8px; letter-spacing: 0.2em; text-transform: uppercase;
  white-space: nowrap; overflow: hidden; color: var(--fg-muted);
}
/* ---------- Chamfer buttons and tags ---------- */
/* chamfers top-left and bottom-right; the outline variant fakes a 1px border with an inset ::after (clip-path kills real borders) */
@utility cut {
  clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
}
@layer components {
  .btn {
    --cut: 10px;
    position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: .625rem;
    padding: .75rem 1.5rem; min-height: 2.75rem;
    font-family: var(--font-sans); font-size: .9375rem; font-weight: 500; letter-spacing: -0.01em; white-space: nowrap; cursor: pointer;
    background: var(--color-ink); color: var(--color-paper-raised);
    clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
    transition-property: background-color, color, transform;
    transition-duration: 120ms; transition-timing-function: var(--ease-out);
  }
  .btn > .arrow { transition: transform 160ms var(--ease-out); }
  .btn:hover > .arrow { transform: translateX(4px); }
  .btn:active { transform: translateY(1px); }
  .btn-signal { background: var(--color-signal); color: #fff; }
  .btn-signal:hover { background: var(--color-ink); }
  .btn:not(.btn-signal):not(.btn-outline):hover { background: var(--color-signal); }
  .night .btn:not(.btn-signal):not(.btn-outline) { background: var(--color-chalk); color: var(--color-night); }
  .btn-outline { background: var(--fg); color: var(--fg); }
  .btn-outline::after {
    content: ""; position: absolute; inset: 1px; z-index: -1; background: var(--surface);
    clip-path: polygon(calc(var(--cut) - .586px) 0, 100% 0, 100% calc(100% - var(--cut) + .586px), calc(100% - var(--cut) + .586px) 100%, 0 100%, 0 calc(var(--cut) - .586px));
    transition: background-color 120ms var(--ease-out);
  }
  .btn-outline:hover::after { background: var(--surface-raised); }
  .btn-sm { --cut: 7px; padding: .375rem 1rem; min-height: 2rem; font-size: .8125rem; }

  /* Status chip: solid fill + glyph, so colour is never the only signal (WCAG 1.4.1). Contrast of each pair is >= 4.5:1. */
  .chip {
    --cut: 5px;
    display: inline-flex; align-items: center; gap: .5rem; padding: .125rem .625rem .125rem .5rem; height: 1.5rem;
    font-family: var(--font-mono); font-size: var(--text-micro); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap;
    clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
    background: var(--c, var(--color-paper-sunk)); color: var(--on, var(--color-ink));
  }
  .chip::before { content: ""; width: .5rem; height: .5rem; background: currentColor; flex: none; }   /* glyph: square by default */
  .chip[data-status="HELD"]         { --c: var(--color-held);     --on: var(--color-ink); }
  .chip[data-status="HELD"]::before { background: linear-gradient(90deg, currentColor 0 3px, transparent 3px 5px, currentColor 5px 8px); }   /* pause bars */
  .chip[data-status="CALLING"]      { --c: var(--color-calling);  --on: #fff; }
  .chip[data-status="CALLING"]::before { animation: ping-dot 1.6s var(--ease-out) infinite; }
  .chip[data-status="VERIFIED"]     { --c: var(--color-verified); --on: var(--color-ink); }
  .chip[data-status="VERIFIED"]::before { clip-path: polygon(0 55%, 18% 40%, 40% 62%, 82% 12%, 100% 28%, 40% 100%); }   /* check */
  .chip[data-status="BLOCKED"]      { --c: var(--color-blocked);  --on: var(--color-paper-raised); }
  .chip[data-status="BLOCKED"]::before { clip-path: polygon(15% 0, 50% 35%, 85% 0, 100% 15%, 65% 50%, 100% 85%, 85% 100%, 50% 65%, 15% 100%, 0 85%, 35% 50%, 0 15%); }  /* x */
  .chip[data-status="NEEDS_REVIEW"] { --c: var(--color-review);   --on: var(--color-ink); }
  .chip[data-status="NEEDS_REVIEW"]::before { clip-path: polygon(50% 0, 100% 100%, 0 100%); }   /* triangle */
}
```

Usage: `<section class="shell">` for a ruled section, `<section class="shell night">` for a dark one; `<h1 class="display text-display-xl">`; `<span class="label">`; `<a class="btn btn-signal">Label <span class="arrow">→</span></a>`; `<a class="btn btn-outline -ml-2">` overlaps buttons like Greptile's group; `<span class="chip" data-status="BLOCKED">Blocked</span>`; frozen money row = `class="hatch"`; recording mode = `<html data-scale="video">`.

---

## 4. Frontend stack, tooling and workflow

### 4.1 Versions (npm registry, checked 2026-11-09)

| Package | Version | Note |
|---|---|---|
| `next` | 16.4.6 | App Router, Turbopack default |
| `react` / `react-dom` | 19.3.1 | |
| `tailwindcss` + `@tailwindcss/postcss` | 4.3.5 | I compile-tested with 4.3.3 (the registry I used lacked 4.3.5 for the CLI package) |
| `motion` | 14.11.1 | `import { motion } from "motion/react"` |
| `@number-flow/react` | 0.6.2 | KPI and stat count-ups; standard in the app (agent 05) |
| `@paper-design/shaders-react` | 0.0.82 | Apache-2.0; **pin exact**, 0.0.x ships breaking changes (maintainers' own advice) |
| `gsap` | 3.15.1 | Free for any use since 2025-04-29/30 (Webflow acquisition), incl. SplitText and ScrollTrigger; the only restriction is building a no-code animation tool that competes with Webflow. **Not needed.** |
| `lenis` | 1.3.27 | **Not used** (scroll feel is a tell; Greptile does not use it either) |
| `shadcn` (CLI) | 4.23.0 | Base UI is the default registry since July 2026; Radix still supported with `shadcn init -b radix` |
| `@base-ui/react` / `radix-ui` | 1.9.0 / 1.8.1 | |
| `lucide-react` | 1.70.0 | **Not used** on the landing page or in the app |
| `@phosphor-icons/react` | 2.1.10 | not used; noted as the only icon set that would pass if one were forced |
| `playwright` | 1.65.0 | critique loop; I ran Chromium 141 |
| `@fontsource-variable/mona-sans`, `@fontsource/ibm-plex-mono` | 5.3.0 each | OFL-1.1 |

Licenses: Paper Shaders Apache-2.0 and the two fonts OFL-1.1 were checked; GSAP has its own no-charge license (above); the other packages are not individually re-checked here (Next, React, Tailwind, Motion, NumberFlow, shadcn, Playwright are widely published as MIT). Total cost of the stack and tooling: **USD 0**, plus about USD 0.15-0.90 if we generate 1-6 handset stills with Nano Banana Pro.

### 4.2 Stack decisions, with why-not

| Need | Pick | Why | Why not the alternatives |
|---|---|---|---|
| Framework | Next.js 16 | Coordinator's stack; one app for landing and product | Astro would be lighter for a static page, but the architect needs one codebase. |
| Styling | Tailwind v4 with a **wiped `@theme`** | Guardrails against slop (section 2); CSS-first tokens | CSS modules: no shared token layer for agent 05. |
| Components (landing) | Hand-built | 6 sections, zero library components needed | shadcn on the landing page drags in rounded cards and Inter defaults. |
| Components (app) | shadcn primitives, re-themed (section 7) | Dialog, tabs, popover, dropdown, tooltip give correct a11y for free | Building these in a day costs more than re-theming. |
| UI motion | `motion` | `whileInView`, `AnimatePresence`, `useReducedMotion`, `useInView`; Greptile uses the same | GSAP is free now but a second animation runtime adds about 30 KB for nothing we spec. |
| Numbers | `@number-flow/react` | Digit-roll count-up is a distinct, cheap, polished effect (Increase uses a digit-roll too) | Hand-rolling tween text: slower to build and to get tabular alignment right. |
| Scroll | Native | Less to break; no hijacking | Lenis: smoothness adds latency and is a recognizable "agency site" tell. |
| Ambient texture | `@paper-design/shaders-react` `Dithering`, CTA only, lazy | Same component Greptile ships; one canvas | three/R3F/OGL: 100+ KB for a look a halftone PNG already gives. |
| Hero illustration | Baked halftone PNG-8 | 73 KB, no runtime | Spline, Unicorn Studio, Lottie: heavy runtimes, soft "3D blob" look, harder to keep on-palette. |
| Icons | Pixel glyphs + hand-drawn 12px SVG | Lucide on every item is tell #7 | `lucide-react`: banned by the lint. |
| Fonts | `next/font/local` or fontsource | Self-hosted, zero third-party request at demo time (conference Wi-Fi) | Google Fonts CDN: a network dependency during a live demo. |

Minimal install (landing + app share one package):

```bash
npx create-next-app@latest countercall --ts --tailwind --app --src-dir --use-npm --turbopack --import-alias "@/*"
cd countercall
npm i motion @number-flow/react @paper-design/shaders-react@0.0.82 @fontsource-variable/mona-sans @fontsource/ibm-plex-mono
npm i -D playwright
npx playwright install chromium
# app primitives (agent 05): run init FIRST, then overwrite the generated tokens with our globals.css
npx shadcn@latest init -b radix
```

Fonts, option 1 (tested path, simplest): in `globals.css` the header comment already lists the fontsource imports (`@import "@fontsource-variable/mona-sans/wdth.css"` plus the three Plex Mono weights). Option 2 (lower layout shift, **UNTESTED**, copy the `.woff2` files out of `node_modules/@fontsource*/files/` into `src/fonts/`):

```tsx
// src/app/layout.tsx
import localFont from "next/font/local";
const mona = localFont({
  src: "../fonts/mona-sans-latin-wdth-normal.woff2",
  variable: "--font-mona", display: "swap", weight: "200 900",
});
const plex = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-plex", display: "swap",
});
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${mona.variable} ${plex.variable}`}><body>{children}</body></html>;
}
```

The `@theme` font stacks already read `var(--font-mona, "Mona Sans Variable")`, so either path works unchanged. Note: Mona's width axis comes only from the `wdth` file; `font-stretch: 112%` has no effect on the weight-only file.

### 4.3 Design-tool evaluation

Evidence level: vendor pages and pricing pages fetched or searched 2026-11-09. Prices are USD. Where sources disagreed I say so.

| Tool | What it is | Cost / limits (as found) | Verdict for a 1-day, no-designer build |
|---|---|---|---|
| **Claude Code from tokens + Playwright critique loop** | Our tokens (tested CSS) plus screenshots and a lint | USD 0 extra | **Primary.** Tokens are decided; the loop catches drift. |
| Figma + Figma MCP | Design canvas with an MCP server for Claude Code | Free (Starter) seats: sources conflict, from about 6 to 20 MCP calls per month; paid seats raise it | **Skip.** Rate limit on a free seat and the hand-off ceremony cost more than they save with no designer on the team. |
| Figma Make | Prompt-to-app inside Figma | Credit-metered | Skip. Output carries generic defaults. |
| v0 (Vercel) | Prompt-to-UI, shadcn output | Free tier: one-time USD 5 credit, 7 messages per day (as found) | Skip. Emits shadcn + Inter + rounded cards, the exact tells. Agent 05 also recommends skipping. |
| Lovable | Prompt-to-app | Pricing not verified | Skip. Same look. |
| Magic Patterns, Subframe | Prompt-to-UI / visual builder with code export | Pricing not verified | Skip. Another pass between us and the tokens. |
| Mobbin | Screenshot library of real apps | Paywalled | Skip. Our reference captures are already local. |
| **Google Stitch** | Free prompt-to-UI that exports a `DESIGN.md` | Free (as found) | **Optional, ideation only** (10 minutes of moodboard variants). Do not ship its output. |
| **Claude Design** | Anthropic design surface (research preview, launched 2026-04-17) | Standalone site reportedly closes 2026-12-14 (single source, **UNVERIFIED**) | Optional ideation only, same rule. |
| Paper Design (paper.design) | Design tool by the Paper Shaders authors | Not evaluated beyond the shaders library | Skip. |

### 4.4 Recommended workflow vs Figma-first

Timeline for the ~36-hour window (landing + the shared tokens; app work belongs to agent 05):

| T+ | Step | Output |
|---|---|---|
| 0:00 | Create the Next app, paste `globals.css`, fonts, `lib/motion.ts` (below). Commit. | Specimen route `/specimen` rendering type, chips, buttons, night section (copy the HTML from `tools04` renders as a guide) |
| 0:30 | `halftone.py` on 4-6 handset stills (or CC0 photo). Pick one. | `public/art/handset*.png` |
| 1:00 | Hero + `InterceptScene` (section 5.1) | Looping scene, reduced-motion final frame |
| 2:00 | Sections 5.2-5.7 in order, one prompt each (section 6.2) | Static page without motion polish |
| 3:00 | Motion pass: type-in, count-up, stamp, hover | Section 3.7 table satisfied |
| 3:30 | Critique loop: `slop-lint.js` + screenshots + rubric, max 3 rounds | PASS |
| 4:00 | Perf pass (5.8), mobile pass at 390, a11y pass | Lighthouse numbers |
| 4:30 | Record the hero scene (agent 06) with `data-scale="video"` | Clip |

Why not Figma-first. A Figma-first flow pays for (a) a designer who is not here, (b) a hand-off that ends in the same CSS the tokens file already contains, and (c) Figma MCP calls that are rate-limited on free seats. What we do need from a design tool is an answer to "does this look right?", and the Playwright screenshot plus lint plus rubric answers that faster, repeatedly, on the real DOM. Exception: if a teammate already has a polished Figma frame of the hero, import that as the reference image to the prompt, not as a build step.

### 4.5 Local skills review

I read the skill files (names as listed in the harness; all under the ECC plugin):

| Skill | Verdict | How to use it here |
|---|---|---|
| `frontend-design-direction` | **Usable.** Forces a product-specific direction before code. | Our section 0 and 3.1 are the answer to its questions. Paste the section 3.1 table into the prompt. |
| `design-system` (has a slop-check mode) | **Usable.** | Run it in slop-check mode on the finished page, in addition to `slop-lint.js`. |
| `make-interfaces-feel-better` | **Usable.** Small details: hit areas, `text-wrap: balance`, tabular numbers, concentric radii, image outlines. | Radii do not apply (0). The rest does; most is already in `globals.css` base. |
| `motion-foundations` | **Usable with edits.** Keep: token pattern and its 8 rules. **Replace:** its bouncy springs and `scale.pop`. | Our `lib/motion.ts` (below) has no springs. |
| `motion-patterns`, `motion-advanced` | Headings only read. | Use for reveal and stagger recipes if needed. Skip anything with parallax or scroll-jacking. |
| `taste`, `taste-application` | **Not usable.** They are video/music-edit skills, unrelated to UI. | Do not invoke; the rubric in section 6.4 is our taste layer. |

`lib/motion.ts` (token mapping, no springs, mirrors section 3.7):

```ts
// src/lib/motion.ts
export const ease = {
  out: [0.23, 1, 0.32, 1] as const,   // entrances; matches --ease-out
  in: [0.7, 0, 0.84, 0] as const,      // exits only
};
export const dur = { fast: 0.12, base: 0.2, slow: 0.4, settle: 0.65, stamp: 0.22 } as const;
// One reveal for the whole page. 8px, once. Everything else is bespoke.
export const rise = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: dur.settle, ease: ease.out },
} as const;
```

---

## 5. Landing page spec

Page order: **Frame, 1 Hero, 2 Problem, 3 How it works, 4 Transcript, 5 Trust anchor, 6 Ramp, 7 CTA + footer.** Designed at 1440 (tested at 1440 and 390 in the specimen). All data on the page is synthetic and labelled so. Stage-size note: the app is designed on a 1280x720 stage (agent 05) and the video is recorded at 1440x900 (agent 06); the landing page and tokens work at both, and `<html data-scale="video">` raises micro labels from 11px to 13px for recording.

Class names below use the utilities and components from section 3.9. Every section is `class="shell"` unless noted.

### 5.0 Frame: announcement strip and nav

```
+--------------------------------------------------------------------------------+
| BBS x RAMP HACKATHON . ROUND 2 BUILD . EVERY NUMBER AND NAME ON THIS PAGE IS   |  strip: 32px, ink bg, chalk mono 11px
| SYNTHETIC DATA                                                                 |
+--------------------------------------------------------------------------------+
| [#] CounterCall     How it works  Trust model  Ramp          [ See the demo -> ]|  nav: 56px, dashed bottom rule
+--------------------------------------------------------------------------------+
```

Copy: strip as above (single line at 1440, wraps to two lines at 390 with `text-[10px]`). Nav links: `How it works`, `Trust model`, `Ramp`; button `See the demo`. Hover on links: background flips to `hilite` with ink text, 120ms (Greptile flips to mint; ours is the marker-pen highlight). Sticky nav: a 1px solid bottom rule appears only after 8px of scroll (no blur, no shadow, no backdrop). Mobile: wordmark left, a single mono `MENU` toggle right that opens a full-width ruled list.

### 5.1 Hero: "email intercepted, call placed, payment blocked"

```
+--[rail]---------------------------------------------------------------[rail]--+
+                                                                               +
+  [.] VENDOR BANK-CHANGE FRAUD / ACCOUNTS PAYABLE      FIG. 01 / LIVE INTERCEPT +
+                                                       +-------------------------+
+  Call the number                                      | INBOX . ap@acme... 09:41|
+  you already                                          | Updated banking details |
+  have.                                                |-------------------------|
+                                                       | DETECTOR       [HELD]   |
+  CounterCall reads every bank-change email,           | Acme Industrial $48,210 |
+  holds the payment, and phones the vendor             |-------------------------|
+  on the number from your records.                     | DIAL  ~+1 415 555 0142~ |
+  No answer, no payment.                               |        +1 415 555 0199  |
+                                                       |-------------------------|
+  [ See a blocked payment -> ][ Read the trust model ] | CALL         [CALLING]  |
+                                                       | Agent: Did someone at.. |
+  (halftone handset bleeds off the right edge,         | Vendor: No, we haven't. |
+   behind the scene panel)                             |-------------------------|
+                                                       | OUTCOME      [BLOCKED]  |
+                                                       | $48,210.00 not sent.    |
+                                                       +----------[ BLOCKED ]----+
+-------------------------------------------------------------------------------+
```

**Final copy.**
- Eyebrow: `Vendor bank-change fraud / accounts payable` (with the 6px cobalt square).
- H1: **Call the number you already have.** (`display`, `text-[clamp(3rem,6.4vw,6.5rem)]`, 7 of 12 columns; TESTED to hold three or four lines.)
- Sub: "CounterCall reads every bank-change email, holds the payment, and phones the vendor on the number from your records. No answer, no payment." (`text-xl`, `max-w-[34ch]`, `text-ink-2`)
- Buttons: primary `See a blocked payment →` (`btn btn-signal`, scrolls to the transcript section), secondary `Read the trust model` (`btn btn-outline -ml-2`, scrolls to 5.5).
- Caption: `FIG. 01 / LIVE INTERCEPT` left, running clock `00:00` right. Alt text (aria-label on the figure): "Animated walkthrough: a bank-change email is intercepted, the vendor is called, and the payment is blocked."

**The scene (the hero visual is the product itself).** One panel, `border border-fg bg-surface-raised`, five rows revealed in sequence, loop 13.4s. Prototype: `tools04/scene-prototype.html` (render of the last frame: `renders/hero-scene-stage4.png`).

| Stage | Start (ms) | Dwell (ms) | What appears | Motion |
|---|---|---|---|---|
| 0 Email | 0 | 1600 | Inbox row: "Updated banking details, Invoice 4471" with the quote "Please remit to our new account ending 7731 effective immediately." | Row rises 8px, 400ms `ease-out` |
| 1 Held | 1600 | 2000 | Detector row; chip HELD; "Acme Industrial / $48,210.00" | Row rises; the money line gets the `hatch` pattern (frozen) |
| 2 Dial | 3600 | 2000 | `+1 415 555 0142` struck through "in the email"; `+1 415 555 0199` "on file since 2024-03" | Strike draws left to right in 300ms (`scaleX` 0 to 1, origin left) |
| 3 Call | 5600 | 4000 | Chip CALLING (square pulses); Agent line types in at 25ms/char, pause 700ms (`--beat-gap`), Vendor line types in | `steps(1)` caret; type-in is linear |
| 4 Blocked | 9600 | 3800 | Outcome row, chip BLOCKED, "$48,210.00 not sent. Email flagged as fraud."; the **BLOCKED stamp** lands bottom-right | Stamp scale 1.5 to 1, rotate -8 to -4 deg, 220ms, preceded by a 120ms `steps(1)` opacity flip |
| Loop | 13400 | - | All rows reset together (100ms fade), clock returns to `00:00` | |

```tsx
// src/components/landing/InterceptScene.tsx   (sketch: structure and timing TESTED in the HTML prototype, the React wrapper is UNTESTED)
"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

const START = [0, 1600, 3600, 5600, 9600] as const; // stage start times
const LOOP = 13400;
const LAST = START.length - 1;

export function InterceptScene() {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { amount: 0.3 });
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(reduced ? LAST : 0);

  useEffect(() => {
    if (reduced) { setStage(LAST); return; }
    if (!visible) return;                       // pause offscreen
    const t0 = performance.now() - START[stage]; // resume where we left off
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - t0) % LOOP;
      setStage(START.findLastIndex((s) => t >= s));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduced]);

  // rows read: data-on={stage >= n}; CSS handles the transitions (see .row in the prototype)
  return <figure ref={ref} /* ...rows with data-at, chips, .stamp when stage === LAST... */ />;
}
```

Implementation notes:
- Transitions live in CSS (`.row`, `.stamp` in the prototype); React only flips `data-on`. Avoid animating from JS per frame.
- Keep the typed transcript lines as one `<span>` each with `clip-path: inset(0 var(--r) 0 0)` driven by a single `--r` custom property, or simply render partial strings from `stage` + a local char counter; do not use a typewriter library.
- `useReducedMotion()` true: render stage 4 statically (the stamp visible, no loop).
- Pause when the tab is hidden (`document.visibilityState`) in addition to offscreen; the rAF loop already stops in background tabs.
- The data in the scene should come from the same seed fixtures as the app (agent 01 owns the vendor, invoice and amount: **$48,210.00 / Acme Industrial / Invoice 4471 / ending 7731 are placeholders, align with agent 01's seed**).

**Behind the scene:** the halftone handset (`public/art/handset.png`, about 73 KB) is positioned `absolute right-[-8%] top-[8%] w-[62%]` behind the panel, `z-0`, `aria-hidden`, `pointer-events-none`, `loading="eager"` with `fetchPriority="high"` (it is not the LCP element if the H1 renders first; the H1 is). Optional hover: cobalt layer shifts 3px to 0.

**Load choreography (once).** H1 words rise 8px with 60ms stagger (6 words max, `--d-settle`); eyebrow, sub, buttons rise at 0, 120, 240ms after the H1; the scene starts its loop 400ms after load. Nothing else animates.

**Responsive.** At <1024px the grid is one column: eyebrow, H1 (`text-[clamp(2.75rem,12vw,4rem)]`), sub, buttons stacked full width, then the scene panel full width, the handset drops to `opacity` 0.9 and `w-[90%]` behind the top-right of the panel or is hidden (hide it below 640px to save bytes: `hidden sm:block`). Rails and `+` marks are hidden under 768px (built into `shell`). Scene text stays at 13px; the panel never scrolls horizontally (`min-w-0`, `break-words` on the quote).

### 5.2 Problem: "One forged email. One wire. No way back."

```
+-------------------------------------------------------------------------------+
+  No. 01 - THE PROBLEM                                                          +
+                                                                                +
+  One forged email.                                                             +
+  One wire.                                                                     +
+  No way back.                                                                  +
+                                                                                +
+  +---------------------+---------------------+-----------------------------+  +
+  | 3 in 4              | 22%                 | 1 number                    |  +
+  | orgs reported ...   | of ... lost ...     | You already have it. It is  |  +
+  | SOURCE: ...         | SOURCE: ...         | the one in your vendor      |  +
+  +---------------------+---------------------+-----------------------------+  +
```

**Final copy.**
- Eyebrow `No. 01 - THE PROBLEM`; H2 (`display text-display-lg`, three short lines): **One forged email. One wire. No way back.**
- Lead: "Business email compromise works because the email and the bank details arrive together. The person who approves the change is trusting the same channel the attacker controls." (`text-xl`, 40ch)
- Stat cells (Plex Mono 500 numerals, `clamp(3rem,6vw,5rem)`, label caption below, a `SOURCE:` line in 11px mono):
  1. `3 in 4` and "organizations hit by payment fraud attempts in the last year"
  2. `22%` and "of those that were hit by attempted fraud lost money"
  3. `1 number` and "You already have it. It is the one in your vendor master."
- **The statistics are UNVERIFIED placeholders.** I did not verify them. Agent 03 owns the numbers and citations; replace the figures and source lines with theirs (the AFP Payments Fraud Survey and FBI IC3 reports are the likely sources, not checked by me). Rule: no figure ships without a clickable source line. If only two figures can be sourced, make the grid two cells plus the "1 number" cell. A fourth cell appears only if we measured something ourselves (for example "14 seconds: time from email to blocked payment in our demo", from agent 06's recording).

**Motion.** Numerals count up once on entering the viewport (NumberFlow, 900ms, `ease-out`; `format` suffix `%`); the third cell types "1 number" with no animation. Cells separated by `1px solid var(--rule)` rules; no cards, no icons.

**Responsive.** Cells stack, each with a top rule; numerals `clamp(2.75rem,14vw,4rem)`.

### 5.3 How it works: Detect, Hold, Call, Decide

```
+-------------------------------------------------------------------------------+
+  No. 02 - HOW IT WORKS                                                         +
+  Four steps. One of them is a phone call.                                      +
+                                                                                +
+  +----------------+----------------+----------------+----------------+         +
+  | 01  [mail]     | 02  [lock]     | 03  [phone]    | 04  [stamp]    |         +
+  | DETECT         | HOLD           | CALL           | DECIDE         |         +
+  | text 2-3 lines | text 2-3 lines | text 2-3 lines | text 2-3 lines |         +
+  | > field diff   | > payment row  | > dial pad     | > outcome chip |         +
+  +----------------+----------------+----------------+----------------+         +
```

**Final copy** (each cell: a pixel glyph at `unit=6`, a mono step number, a `display text-display-md` title, two lines of body, and a different tiny artifact at the bottom):

1. **Detect.** "Reads the inbox. When an email asks to change bank details, it pulls out the vendor, the invoice and the new account." Artifact: a two-line diff, `acct ****4410` struck, `acct ****7731` underlined with `hilite`.
2. **Hold.** "Freezes the payment in the queue before it can be released. The money row stays visible, hatched, with the reason." Artifact: a hatched row `Acme Industrial . $48,210.00 . [HELD]`.
3. **Call.** "Phones the number from your vendor master, never the one in the email, and asks one question: did you request this change?" Artifact: a 3x4 dial pad of mono keycaps with `0199` lit.
4. **Decide.** "Confirmed releases the hold. A denial blocks the payment and flags the email. No answer or an unclear answer goes to a person." Artifact: three chips in a row: VERIFIED, BLOCKED, NEEDS REVIEW.

Deliberately uneven: the artifacts differ in height and shape; step 3's cell is the only one with `bg-signal` text on a hairline; step 4's chips are the only place all three outcome colors appear together on the page. This avoids the "three equal icon cards" tell (lint `no-three-icon-cards`).

**Motion.** Cells reveal with the standard `rise` once (stagger 80ms); the 4-step connector is a dashed rule that draws left to right (`stroke-dashoffset` 600ms) when the section enters; hover on a cell: its artifact gets `bg-hilite` for 120ms. **Responsive.** Two columns at 768-1023, one column below with the step numbers in a left gutter.

### 5.4 Transcript widget: hear the call (dark)

```
+-- .night ---------------------------------------------------------------------+
+  No. 03 - THE CALL                                                             +
+  Three ways a call ends.                                                       +
+                                                                                +
+  [ Vendor says no ]  [ Nobody answers ]  [ "I think so?" ]                    +
+  +-----------------------------------------+ +--------------------------------+
+  | 00:03  AGENT   Hello, this is ...       | | POLICY                         |
+  | 00:09  VENDOR  No, we haven't ...       | |  outcome   BLOCKED   [x]       |
+  | 00:12  AGENT   Thanks. I'll mark ...    | |  payment   not sent            |
+  |                                    _    | |  email     flagged as fraud    |
+  +-----------------------------------------+ +--------------------------------+
+  FIG. 02 / SYNTHETIC CALL. NO REAL VENDOR WAS CALLED.                          +
```

The only dark section on the landing page, and the only place the page shows a conversation. It mirrors the app's call card (agent 05: the only dark surface in the app), so the same component can serve both.

**Final copy.**
- Eyebrow `No. 03 - THE CALL`; H2 **Three ways a call ends.**
- Lead: "The agent asks one question and writes down what it hears. What happens next is policy, not improvisation."
- Tabs (mono, underline in `signal-soft` for active, `role="tablist"`): `Vendor says no`, `Nobody answers`, `"I think so?"`.
- Transcript A (`Vendor says no`, outcome BLOCKED): AGENT "Hi, this is CounterCall calling for Acme's accounts payable. Did someone at your company ask to change your bank details today?" VENDOR "No, we haven't changed banks." AGENT "Thank you. I will tell them not to pay anything to a new account." Policy panel: outcome `BLOCKED`, payment `not sent`, email `flagged as fraud`.
- Transcript B (`Nobody answers`, outcome NEEDS REVIEW): `00:00 DIAL +1 415 555 0199`, `00:30 NO ANSWER`, `00:31 VOICEMAIL: Left a message, no account details given`, then the policy panel `outcome NEEDS REVIEW`, `payment held`, `task opened for a person`.
- Transcript C (`"I think so?"`, outcome NEEDS REVIEW): VENDOR "Um, I think so? Maybe someone in finance sent something." AGENT "I could not confirm that. I will hold the payment until a person checks." Policy: `outcome NEEDS REVIEW`, `reason unclear answer`, `payment held`.
- Caption: `FIG. 02 / SYNTHETIC CALL. NO REAL VENDOR WAS CALLED.` (The word "SYNTHETIC" matters for honesty; agent 06 may replace it with a real recording of a staged call, then the caption changes to "STAGED CALL, SCRIPTED VENDOR".)
- Data shape: a transcript is `{ t: string, who: "AGENT" | "VENDOR" | "SYSTEM", text: string }[]` plus `{ outcome: Status, policy: { label: string, value: string }[] }`. **Align with agent 01** (voice runs on Retell, so Retell's transcript objects, with role and timestamps, should be mapped to this shape in one function; email is AgentMail). Status names are exactly `HELD | CALLING | VERIFIED | BLOCKED | NEEDS_REVIEW`.

**Motion.** On tab change: the transcript clears (`steps(1)`), lines type in at 25ms/char with 700ms between speakers, the policy panel rows appear one per 200ms after the last line, the outcome chip lands with the stamp animation only for BLOCKED. A `Replay` mono button re-runs it. `aria-live="polite"` on the transcript region; under reduced motion everything is rendered at once.

**Responsive.** Policy panel moves below the transcript; tabs become a horizontally scrollable ruled row (no wrapping), each 44px tall.

### 5.5 Trust anchor: why a phone call

```
+-------------------------------------------------------------------------------+
+  No. 04 - THE TRUST MODEL                                                      +
+                                                                                +
+  The scammer controls the email.        1  The number comes from your records. +
+  They don't control the phone line.     2  Nothing is paid until a person       +
+                                            answers.                            +
+  [halftone handset, large, cobalt       3  Silence is not consent.              +
+   layer offset]                                                                +
+  MICROPRINT RULE ........................................................      +
+-------------------------------------------------------------------------------+
```

**Final copy.**
- Eyebrow `No. 04 - THE TRUST MODEL`.
- H2 (the page's pull quote, `display text-display-lg`): **The scammer controls the email. They don't control the phone line.**
- Three numbered rules (mono numerals `1`, `2`, `3`, each a 2-line statement; no icons):
  1. "**The number comes from your records.** Never from the email, a signature, or a link."
  2. "**Nothing is paid until someone answers.** A held payment stays held."
  3. "**Silence is not consent.** No answer, a vague answer, or a voicemail goes to a person, not to a release."
- A microprint rule below the section: `CALL THE NUMBER ON FILE . NEVER THE NUMBER IN THE EMAIL .` repeated (6px mono, `microprint` utility).
- Honesty line under rule 1 (small, `ink-muted`): "Limit: if the vendor master was already poisoned, the call reaches the wrong person. CounterCall flags recent vendor-master edits for review." **Confirm this behavior with agent 01 before shipping the sentence; remove it if the product does not do it.**

**Motion.** The pull quote is static. The handset appears at 5/12 width, cobalt layer offset 3px; when the section enters, the cobalt layer slides from 12px to 3px offset in 600ms (the one "registration snaps into place" moment). **Responsive.** Handset above the headline at 70% width, cropped by the left edge; rules stack.

### 5.6 Ramp integration

```
+-------------------------------------------------------------------------------+
+  No. 05 - WHERE IT SITS                                                        +
+  Ramp pays the bill. CounterCall decides whether it should.                    +
+                                                                                +
+  [ Ramp bill ] --> [ HOLD ] --> [ CounterCall call ] --> [ release / block ]   +
+      GET /bills        POST /holds?        VERIFIED            POST /release   +
+  endpoints in mono under each node; dashed arrows; one node in cobalt          +
+-------------------------------------------------------------------------------+
```

**Final copy.**
- Eyebrow `No. 05 - WHERE IT SITS`; H2 **Ramp pays the bill. CounterCall decides whether it should.**
- Four-node flow, each node a 1px solid box with a mono label and the endpoint in `ink-muted` 11px: `Ramp bill` (`GET /bills`), `Hold` (the hold or approval step, name from the brief), `CounterCall call` (cobalt border, no fill), `Release or block`. **Use the exact Ramp endpoint names from the shared brief (`00-context.md`) and agent 03/08's findings; I did not re-verify the Ramp API, so the endpoint strings in the sketch are placeholders.** Also confirm with 03/08 whether the page may say "built against Ramp's API" or must say "modeled on Ramp's API" (honesty rule: if the demo runs on a mock, say so on the page).
- Footnote (11px mono): `RAMP IS A TRADEMARK OF ITS OWNER. COUNTERCALL IS A HACKATHON PROJECT AND IS NOT AFFILIATED WITH OR ENDORSED BY RAMP.` (brand-use wording to be confirmed with agent 03).
- Do not use Ramp's logo or its lime. A plain mono wordmark `RAMP` in `ink` is enough.

**Motion.** Arrows between nodes draw in sequence (dashed `stroke-dashoffset`, 400ms each, once); the cobalt node gets no pulse. **Responsive.** The flow turns vertical (nodes stacked, arrows down), endpoints stay visible.

### 5.7 CTA and footer

```
+-- .night ---------------------------------------------------------------------+
+  [dithered wave texture, very slow, behind]                                    +
+                                                                                +
+  Stop paying                                                                   +
+  scammers.                                                                     +
+                                                                                +
+  [ See the demo -> ]  [ Read the code ]                                        +
+-------------------------------------------------------------------------------+
+  MICROPRINT .............................................................      +
+  BBS x RAMP HACKATHON . ROUND 2 . SYNTHETIC DATA . NO REAL PAYMENTS MOVED      +
+  C o u n t e r C a l l   (giant cropped wordmark, 22vw, clipped at the bottom)  +
+-------------------------------------------------------------------------------+
```

**Final copy.** H2 (`display text-display-xl`): **Stop paying scammers.** Buttons: `See the demo →` (`btn btn-signal`, links to the app route or video), `Read the code` (`btn btn-outline`, repository URL; **placeholder, agent 08 supplies the link**). Footer: microprint rule, the line "BBS x RAMP HACKATHON . ROUND 2 . SYNTHETIC DATA . NO REAL PAYMENTS MOVED", team names (agent 03/coordinator), and the giant `CounterCall` wordmark at `text-[22vw]` with `leading-[0.8]`, cropped so only the top 70% shows (`overflow-hidden` and `translate-y-[18%]`). That crop is the poster gesture that closes the page.

**Motion.** `Dithering` behind the headline: `type="8x8"`, `shape="wave"`, `speed={0.12}`, `size={5}`, lazy-loaded after idle, paused when offscreen, `speed={0}` for reduced motion, `aria-hidden`. The wordmark does not animate. **Responsive.** H2 `clamp(3rem,15vw,5rem)`, buttons stacked full width, wordmark `text-[24vw]`.

### 5.8 Performance budget

Targets are ours (not measured; measure with `lighthouse_audit` or `npx lighthouse` on the production build, mobile profile, before the demo). "UNVERIFIED" means no number from us yet.

| Metric | Budget | Why it should hold |
|---|---|---|
| LCP | <= 1.5s desktop, <= 2.5s mobile 4G | The LCP element is the H1 (text); the handset PNG is 73 KB and sits behind it |
| CLS | <= 0.02 | `next/font` or fontsource with `display: swap`; reserve the scene panel height (min-height) and image `width/height` |
| INP | <= 200ms | No main-thread work except one rAF loop in the scene |
| First-load JS | <= 140 KB gzip (**UNVERIFIED** estimate: Next runtime + React + motion subset + NumberFlow) | `Dithering` and the transcript widget load lazily (`next/dynamic`) |
| CSS | <= 25 KB gzip | Tailwind v4 emits only used utilities |
| Halftone PNG-8 | <= 100 KB each; use at most 2 on a page | `halftone.py --colors 16` (73 KB measured) |
| Fonts | <= 145 KB total (143 KB measured, Mona 98 + Plex 3 x 15) | Preload only the Mona file; subset later if needed |
| WebGL | One canvas on the page (the CTA), DPR capped at 1.5, destroyed when offscreen | |
| Lighthouse (production build) | Performance >= 90 desktop / >= 80 mobile; Accessibility >= 95; Best practices >= 95 | |
| Reduced motion | Final frame, no loops, no shader speed | `useReducedMotion` + the base-layer media query |
| Weight | Total transfer <= 600 KB at first load, <= 1.2 MB after scroll | Fonts + one PNG + JS |

A11y notes: all interactive elements are keyboard reachable with the 2px cobalt focus ring (`focus-visible`); chips carry a text label plus a glyph, never color alone; the hero scene is a labelled figure with a text equivalent in the `aria-label`; tab widget follows the WAI-ARIA tabs pattern; body text is at least 17px and `ink-muted` is only used above 4.5:1.

---

## 6. Prompting playbook

Setup once: copy this report into the repo as `docs/design-spec.md`, copy `tools04/` to `tools/` (`globals.css`, `halftone.py`, `slop-lint.js`, `contrast.py`), put 3 reference captures in `refs/` (`greptile-home-viewport.png`, `oxide-home-viewport.png`, `increase-home-viewport.png`) with a one-line "steal / do not steal" each (table in section 1.2). Claude Code reads PNGs; give at most 3 references per prompt, always with the steal list. Use **plan mode** for the hero and transcript prompts (the two with state), normal mode for the rest.

No v0, Figma Make or Lovable prompts: not recommended (section 4.3).

### 6.1 `CLAUDE.md` block (copy-paste; compatible with agent 05's block, which should be merged into it)

```md
## UI rules (binding for landing page and app; `node tools/slop-lint.js http://localhost:3000` must exit 0)
- Look: "Safety paper and signal". Brutalist-minimal, Greptile-like grammar, our own motifs. Read docs/design-spec.md sections 0, 3, 5 before touching UI.
- Tokens only. All colors, type, spacing and motion come from src/app/globals.css (`@theme` wipes Tailwind defaults, so `rounded-*`, `shadow-*`, `bg-indigo-*`, `white`, `black` do not exist). Never write a hex value in a component. Never add a font, a dependency, a radius, a shadow, a blur or a gradient to "fix" a section; fix layout, type scale, or content instead.
- Fonts: Mona Sans (display wdth 112 wght 800 via `.display`, body 400) and IBM Plex Mono (labels via `.label`, data via `font-mono`). Nothing else.
- Structure: `shell` for ruled sections, `shell night` for dark ones. Dashed 1px rules for structure, solid 1px for objects. Eyebrows read `No. 0N - TITLE`; figures get `FIG. 0N / CAPTION`.
- Icons: none from libraries. PixelGlyph for landing; hand-written 12px SVG with butt caps and miter joins in the app. No emoji.
- Status: five states only, `HELD | CALLING | VERIFIED | BLOCKED | NEEDS_REVIEW`, via `<span class="chip" data-status>`; fill + glyph + text, never color alone; status color never as body text.
- Motion: import from src/lib/motion.ts (`ease`, `dur`, `rise`). 8px max travel, no springs, no parallax, no scroll-jacking, no `transition-all`. Every motion must say in a comment what state it communicates. Each animated thing has a `useReducedMotion` branch. Scripted moments only: load, hero scene, stamp.
- Copy: no word from the ban list in docs/design-spec.md 3.8; every number carries a source line or a SYNTHETIC label; name real objects (invoice, vendor, bank account, wire, callback).
- After every UI change: run the lint, open the three screenshots it writes, and fix what you see before reporting done.
```

### 6.2 Claude Code prompts, one per section

Each prompt assumes the CLAUDE.md block above is loaded. Replace `$N` with the section number in `docs/design-spec.md`.

**P0 - foundation.**
```
Set up the Next.js app per docs/design-spec.md section 4.2: install the listed packages, paste tools/globals.css into src/app/globals.css unchanged, add src/lib/motion.ts from section 4.5, add components/PixelGlyph.tsx from 3.5, and create /specimen showing: display type at three sizes, label and mono data, every button variant on paper and on .night, all five chips, a hatched row, a dot-grid block, a microprint rule. Run `next build`, then `node tools/slop-lint.js http://localhost:3000/specimen`. Do not start any section yet. Report the lint output.
```

**P1 - frame, hero and scene** (plan mode first).
```
Build section 5.0 and 5.1 of docs/design-spec.md exactly: announcement strip, nav, hero. Copy is final; use it verbatim. Build components/landing/InterceptScene.tsx following the sketch and the stage table: five rows driven by one `stage` number, transitions in CSS (copy the .row/.stamp CSS from tools/scene-prototype.html), loop 13.4s, paused offscreen and when the tab is hidden, final frame under reduced motion. Money line uses the `hatch` utility while HELD. Use public/art/handset.png as the cropped background art (placeholder gray rectangle if absent; do not generate art). Reference: renders/hero-scene-stage4.png and refs/greptile-home-viewport.png (steal: poster composition and dashed rails; do not steal: hex shapes or colors). Test at 1440x900 and 390x844 and attach both screenshots.
```

**P2 - problem stats.**
```
Build section 5.2. Use NumberFlow for the two numeric stats (count-up once on view, 900ms). The stats and source lines are placeholders: render them from a `STATS` constant in lib/content.ts with a `source` string and `url`, and show a visible TODO-source marker in dev if a url is missing. No icons, no cards: three cells divided by 1px solid rules. At 390 the cells stack with a top rule each.
```

**P3 - how it works.**
```
Build section 5.3: four ruled cells with PixelGlyph (mail, lock, phone, stamp), mono step numbers, the final copy, and the four different artifacts (diff, hatched row, dial pad of keycaps, three chips). The cells must differ in internal structure and height; do not make four identical cards. Dashed connector draws left to right once on entering the viewport. No Lucide.
```

**P4 - transcript widget** (plan mode first).
```
Build section 5.4 as a client component with the data shape in the spec. Three tabs following the WAI-ARIA tabs pattern, transcripts A, B and C from the spec as fixtures in lib/content.ts, the policy panel, the Replay button. Type-in at 25ms/char, 700ms between speakers, caret blinks with steps(1). The chip uses the stamp animation only for BLOCKED. Reduced motion renders everything instantly. The section uses `shell night`; verify text contrast with `python3 tools/contrast.py` for chalk-muted and signal-soft on night. Keep the transcript JSON shape identical to what the app's call card will consume (agent 05).
```

**P5 - trust anchor.**
```
Build section 5.5. The pull quote is the H2 and is static. Three numbered rules, no icons. Use public/art/handset.png large with the cobalt misregistration layer offset 3px; on entering the viewport the cobalt layer slides from 12px to 3px offset in 600ms with the shared ease. Microprint rule below. Do not add an animation to the text.
```

**P6 - Ramp.**
```
Build section 5.6: four-node flow with dashed arrows that draw in sequence once. Endpoint strings come from lib/content.ts (RAMP_FLOW) and must match research/03 and research/00-context.md; if they conflict, stop and ask. Include the non-affiliation footnote. No Ramp logo, no Ramp colors.
```

**P7 - CTA and footer.**
```
Build section 5.7. Dithering (Paper Shaders) behind the CTA headline, loaded with next/dynamic ssr:false after idle, speed 0.12, speed 0 for reduced motion, aria-hidden, colorBack transparent, colorFront #7C9BFF. Footer: microprint rule, the disclosure line, and the giant cropped CounterCall wordmark (22vw, leading 0.8, top 70% visible). Then run the full taste loop from section 6.4 on the whole page.
```

**P8 - motion pass.**
```
Read docs/design-spec.md 3.7. List every animated element on the page in a table (element, trigger, duration, easing, state it communicates). Delete any that do not communicate a state. Confirm no translate exceeds 8px, no spring, no `transition: all`, every one has a reduced-motion branch. Then fix and rerun the lint.
```

### 6.3 Image-generation prompts

Run through `fal-ai/nano-banana-pro` with the curl in 3.6 (or `nano-banana-2` for cheap iteration), then halftone with `tools/halftone.py`. Generate 4-6 per prompt and keep one. Reject any with a cord, a base, a glossy 3D-render feel, or a gray cast on the background.

**Primary (hero and trust anchor): the handset.**
```
Studio product photograph of a single vintage black Bakelite telephone handset (Western Electric 500 style), floating in mid-air, three-quarter view from slightly above, earpiece cup on the left and mouthpiece cup on the right, no cord, no cradle, no base. One hard key light from the upper left, deep raking shadows, crisp specular highlights along the curved handle, visible surface wear on the edges. Pure white seamless background (#FFFFFF), no floor shadow, no reflection, no text, no logos. Monochrome grayscale, high contrast, sharp focus, large-format film look. The handset fills 80 percent of the frame width.
```

**Secondary (optional, how-it-works step 3 or favicon art): a rotary dial.**
```
Studio product photograph, straight-on close-up of the finger wheel of a vintage black rotary telephone, numbers 1 to 0 visible through the holes, one hard key light from the upper left, deep shadows, specular highlights on the chrome ring, pure white seamless background (#FFFFFF), no text other than the numerals, monochrome grayscale, high contrast, sharp focus. The dial fills 75 percent of the frame.
```

**Tertiary (optional, footer or 404): a rubber stamp.**
```
Studio product photograph of a wooden hand rubber stamp with a black rubber face, three-quarter view, lifted slightly off a white surface, one hard key light from the upper left, deep shadows, visible wood grain, pure white seamless background (#FFFFFF), no ink, no text, monochrome grayscale, high contrast, sharp focus. The stamp fills 70 percent of the frame.
```

Bake each with:
```bash
.venv/bin/python tools/halftone.py art/<name>-base.png public/art/<name>.png --cell 8 --width 1600
```
Keep each PNG under 100 KB (raise `--cell` or lower `--colors` if not). Never put a raw model output on the page.

### 6.4 The taste review loop (Playwright screenshot, critique, fix)

Tool: `tools/slop-lint.js` writes `viewport-390.png`, `viewport-768.png`, `viewport-1440.png` to a folder and prints PASS/WARN/FAIL for 12 automated checks (ids: `no-ai-purple`, `no-colour-gradients`, `no-slop-primary-font`, `no-box-shadows`, `no-glassmorphism`, `h1-not-centered`, `no-three-icon-cards`, `no-lucide`, `small-svg-icons<=14` (WARN only), `no-emoji`, `no-banned-phrases`, `no-transition-all`; it also checks horizontal overflow, border radius and dashed/mono density). Exit code 1 on any FAIL.

```bash
PW_PATH="$PWD/node_modules/playwright" node tools/slop-lint.js http://localhost:3000 /tmp/taste/r1
```

**The loop prompt (paste into Claude Code after each section or before the demo):**

```
Run a taste review round on the landing page. The dev server is running at http://localhost:3000.

1. Run: PW_PATH="$PWD/node_modules/playwright" node tools/slop-lint.js http://localhost:3000 /tmp/taste/rN   (N = round number, start at 1). Record every FAIL and WARN.
2. Read the three screenshots in /tmp/taste/rN with the Read tool. Also read refs/greptile-home-viewport.png for the quality bar.
3. Score the page against the rubric in docs/design-spec.md 6.4 (R1 to R16): 1 = pass, 0 = fail. For every 0, write one line: the element, what is wrong, the specific fix using existing tokens. Be a hostile reviewer. If a screenshot looks like a generic AI landing page, say so and say why.
4. Apply the fixes. Rules for fixing: never add a dependency, font, shadow, radius, blur or gradient; never add a decorative element to cover a weak section; prefer changing layout, scale, copy, or removing things. If a fix needs a new motif, write it as a question instead of building it.
5. Re-run step 1 into /tmp/taste/r(N+1). Maximum 3 rounds. Stop early when the PASS rule below holds.

PASS rule: lint exit code 0, all of R1-R5 pass, and the total score is at least 14 of 16.
Report: a table of round, lint FAIL count, rubric score, and the remaining 0s with proposed fixes. If after 3 rounds the rule does not hold, stop and list what needs a human decision.
```

**Rubric (R1-R5 are blockers; PASS = all five blockers pass and total >= 14/16):**

| # | Check | Pass when | How |
|---|---|---|---|
| R1 | Flat surfaces **(blocker)** | Zero radius > 3%, zero box-shadow, no `backdrop-filter` | lint |
| R2 | Type **(blocker)** | Only Mona Sans and IBM Plex Mono render | lint `no-slop-primary-font` + visual |
| R3 | Color **(blocker)** | Every color is a token; no hue 250-295; no color gradients; cobalt is flat | lint |
| R4 | Icons **(blocker)** | No icon library, no emoji | lint |
| R5 | Responsive **(blocker)** | No horizontal overflow at 390 and 768 | lint |
| R6 | Hero | Left-aligned poster composition; H1 at most 4 lines at 1440; the scene is visible without scrolling at 1440x900 | visual |
| R7 | Real artifact | The visuals are the product scene, a transcript, or the halftone handset: no blob, mesh, stock art | visual |
| R8 | Deliberate imperfection | At least three of: cropped art, cobalt misregistration, rotated stamp, asymmetric grid, oversized numerals | visual |
| R9 | Motion | Scripted moments plus mechanically different reveals; no uniform fade-up across sections; no spring; reduced-motion branch exists | code read + screen recording |
| R10 | Mono annotation layer | Every section has an eyebrow (`No. 0N`) and figures have `FIG.` captions; at least 8 mono labels on the page | lint + visual |
| R11 | Drawn structure | Dashed rules for structure, solid for objects, rails visible >= 768px; no card with a border and padding standing alone | lint (dashed >= 6) + visual |
| R12 | Copy | No banned phrases; every statistic has a source line or a SYNTHETIC label; nouns are AP words | lint + read |
| R13 | Status | Every status shows glyph + text + fill; no status color used as body text | visual |
| R14 | Type hierarchy | Display 800 vs body 400, negative tracking on display, no centered body paragraphs | visual |
| R15 | Rhythm | Section heights and layouts differ; no three equal cards; no uniform `py` on every section | visual |
| R16 | Accessibility | Body contrast >= 4.5:1 (`contrast.py`), visible focus ring, tab order follows reading order, tabs follow ARIA | keyboard test |

The lint is a tripwire, not a judge: it caught 5 issues on greptile.com (which we consider well-designed), so a clean lint says "not obviously slop", not "good". The rubric's visual rows need a human or a model reading the screenshots.

---

## 7. Hand-offs to agent 05 (app UI)

Everything agent 05 asked for exists in `tools04/globals.css` (section 3.9), compiled and tested. Facts and decisions:

**Role mapping.** Agent 05's role names are real tokens (`bg-paper`, `text-ink-muted`, `border-hairline`, `border-rule-strong`, `ring-focus-ring`, `bg-inverse-bg`, `text-inverse-ink`, `bg-accent`, `text-accent-ink`, `bg-evidence`, `bg-evidence-strong`, `text-danger`, `bg-warn`), plus `--hatch`, `--d-instant/fast/base/slow/stamp/settle`, `--ease-out/in/snap`, `--beat-gap`. The mapping table is in section 3.3. Hand-offs 05 listed and where each lives:

| 05 asked for | Delivered |
|---|---|
| Surfaces and ink | `paper #E9E6DE`, `paper-raised #F4F2EC`, `ink #14161D`, `ink-muted #5C6170`, `ink-faint #8A8E9C`; `hairline` = 28% ink (dashed), `rule-strong` = solid ink, `focus-ring` = cobalt 2px offset 2 |
| Inverse (call card only) | `inverse-bg #12141A`, `inverse-ink #ECE9E1`, `inverse-muted #A9A79F`; `.night` flips semantic vars for a subtree (needs `@theme inline`, already set) |
| Semantics | `accent #1B4DFF` (live/go) with `accent-ink #1743E0`; `evidence #F7E26B`; `evidence-strong #EE6DB8`; `danger #D42A14` (4.53:1 white-ish text on fill, verified with `contrast.py`; 05's placeholder `#ff3b1f` is replaced); `warn #FFB81C` |
| Hold as a pattern | `--hatch` and utility `hatch` (45 deg, 1px, 6px pitch, 55%) |
| Type roles | `font-mono`, `font-sans`, `font-display` (Mona Sans); sizes in 3.4 |
| Motion tokens | as above; `--d-stamp: 220ms`, `--beat-gap: 700ms` |
| Light app with one inverted call card, no lucide | Agreed |

**Differences to resolve (small, listed so nobody discovers them in code review):**
1. **Frame ticks.** 05 assumed diamond corner ticks; the landing uses `+` registration marks. Recommend `+` in `<Frame>` for one identity (5-minute change). If 05 keeps diamonds, the landing `shell` marks still stay `+`; it is a visible inconsistency, not a break.
2. **Label tracking.** 05 specified micro 11/16 mono caps at +0.08em; `label` is 0.14em (landing, airy). For the dense app override once at the app root: `[data-app] { --tracking-label: 0.08em }` and put `data-app` on the app layout.
3. **Stamp font.** 05 specified mono bold 26-28px for the app stamp; the landing stamp is Mona Sans 800 at wdth 112. Pick one for both; recommendation: **Plex Mono 600 in the app and on the landing hero** so the scene and the product match, and keep the display font for the footer wordmark only.
4. **`evidence-strong` is pink, and so is NEEDS_REVIEW.** 05 uses the strong highlighter on "who / where the money goes" quotes. They never share a surface with the chip (highlight = ink text on a full-line-height marker; chip = bordered rect with glyph), but if a reviewer finds it confusing use `evidence-strong: #7C9BFF`-class cobalt tint (`color-mix(in oklab, var(--color-signal) 28%, white)`) instead. Decision belongs to 05 and 07.
5. **Stage size.** 05 designs at 1280x720, 06 records 1440x900 with a 13px minimum. Tokens support both: `data-scale="video"` raises `--text-micro` to 13/18; layout is fluid. The architect should fix the recording stage size once.

**shadcn token map** (run `npx shadcn@latest init -b radix` first, then paste our CSS over the generated `:root`/`@theme`; remove the generated `--radius` and the dark `.dark` block, since we use `.night`; keep `tw-animate-css` only if a component needs its keyframes):

| shadcn variable | Our token | shadcn variable | Our token |
|---|---|---|---|
| `--background` | `--surface` | `--primary` | `--fg` (ink) |
| `--foreground` | `--fg` | `--primary-foreground` | `--color-paper-raised` |
| `--card`, `--popover` | `--color-surface-raised` | `--secondary`, `--muted` | `--color-surface-sunk` |
| `--muted-foreground` | `--color-fg-muted` | `--accent` | `--color-signal` (use sparingly; shadcn uses `accent` for hover bg, so map hover bg to `--color-surface-sunk` in the component file) |
| `--destructive` | `--color-blocked` | `--border` | `--rule` |
| `--input` | `--fg` | `--ring` | `--color-signal` |
| `--radius` | `0px` | | |

Because `--color-*: initial` removes `white` and `black`, shadcn classes that name them (`text-white`, `bg-black/50` on overlays) will not compile: replace overlays with `bg-fg/60` and text with `text-paper-raised`.

**Tables, density and data (app-ready):**
- Row heights: dense ledger and audit tables **36px**; the case queue **52px** (05's spec); header row 32px on `surface-sunk`, label type.
- Cell text: Plex Mono 400, 13/20, `tabular-nums` (already on `table` in the base layer); money right-aligned; ids and phone numbers (masked) in mono; names in Mona Sans 15/24.
- Row states: hover `bg-surface-sunk` (120ms); selected = 2px solid left border in the status color + `bg-<status>/10`; frozen = `hatch` over the amount cell only, not the whole row (keeps text legible).
- Status chip: `<span class="chip" data-status="HELD">` is 20px high, mono caps 11px, 1px border, glyph slot; the five fills are in 3.3. NEEDS_REVIEW uses `NEEDS_REVIEW` as the attribute value, label text "Needs review".
- KPIs: NumberFlow with `tabular-nums`, Plex Mono 500; deltas use text plus glyph, never color alone.
- Keycaps: 1px solid border, mono 11px, 0 radius, `bg-surface-raised`; reuse the `.btn-sm` chamfer only for primary actions.
- Focus: 2px cobalt ring offset 2 on everything interactive (in the base layer).

**File naming.** 05 references `src/styles/tokens.css`. Ours is a single `globals.css` (`@import "tailwindcss"` + `@theme` + base + utilities + components). Cheapest: treat `src/app/globals.css` as the tokens file and change 05's CLAUDE.md line to point there. (Splitting the `@theme` block into `tokens.css` and `@import`ing it from `globals.css` should work with the Tailwind v4 PostCSS plugin, **UNTESTED**.)

**Cross-lane items for the coordinator:**
- **01 (voice):** status names must be exactly `HELD | CALLING | VERIFIED | BLOCKED | NEEDS_REVIEW` in the UI contract; transcript JSON shape is in 5.4. Retell transcripts need one mapping function.
- **03 (Ramp):** the problem-section statistics and their citations, the Ramp endpoint strings and "built against" vs "modeled on" wording, the brand-use footnote.
- **06 (video):** record the hero scene from the landing page (`InterceptScene`) at the agreed stage size with `data-scale="video"`; the scene is deterministic so takes repeat.
- **07 (creative):** the handset art route (CC0 photo vs a model still), and whether the BLOCKED stamp and the quoted phrase share the highlighter treatment.
- **08 (architect):** stage size; the single tokens file location; NumberFlow is now a standard dependency; `Dithering` pinned to 0.0.82.

---

## 8. Appendix

### 8.1 Verification log (all 2026-11-09 unless noted)

| Claim | Source | Status |
|---|---|---|
| Package versions in 4.1 | `npm view <pkg> version` against the registry (registry lacked `@tailwindcss/cli` 4.3.5; compiled with 4.3.3) | verified |
| Greptile measured styles, rails, buttons, motion, stack | Live capture of https://greptile.com via Playwright (`greptile-home-data.json`, two CSS chunks, JS bundles) | verified |
| Greptile brand intent quotes | https://www.greptile.com/blog/brand-refresh | verified (fetched) |
| Paper Shaders `Dithering`/`HalftoneDots` props, Apache-2.0, pin advice | `@paper-design/shaders-react` source and README; maintainers' advice via repository issues/README | verified (source read) |
| GSAP free license since 2025-04-29/30 | GSAP license page and Webflow announcement | verified |
| `fal-ai/nano-banana-pro` $0.15/image, 4K double, aspect_ratio, resolution | https://fal.ai/models/fal-ai/nano-banana-pro | verified |
| Mona Sans and Martian Mono OFL-1.1; Plex Mono OFL; fontsource packages 5.3.0 | GitHub license API (Mona Sans, Martian Mono); npm package license fields | verified |
| Font sizes (98 KB, 3 x about 15 KB) | `ls -l` on the fontsource `files/` directory | measured |
| Contrast ratios | `tools04/contrast.py` (WCAG 2.x relative luminance) | measured |
| Halftone 73 KB / 3s on 1400x1000 | `tools04/halftone.py` on a synthetic image | measured (synthetic input) |
| shadcn Base UI default since July 2026; `-b radix` flag | shadcn docs and changelog | verified |
| Anthropic quotes on design defaults | https://claude.com/resources/articles/improving-frontend-design-through-skills | verified (fetched) |
| Adam Wathan `bg-indigo-500` apology (Aug 2025) | https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p | single source, tweet not seen |
| AI tell lists | https://www.925studios.co/blog/ai-slop-design-tells (its dates conflict) | fetched, treat as opinion |
| CSS scroll-driven animations: Chrome 115, Safari 26, Firefox 159 (about 89% global) | caniuse and MDN summaries as found | verified, **not used** by our design (we do not depend on it) |
| Emil Kowalski animation standards | https://github.com/emilkowalski/skills (search result summary) | not opened in full |
| Oxide, Modal, Ramp, Increase, Teenage Engineering, Are.na measurements | Live captures, `design/<name>-home-data.json` | verified |

### 8.2 Unverified or untested (do not rely on these without checking)

1. Problem-section statistics (5.2): placeholders; agent 03 owns citations.
2. A specific public-domain handset photo (3.6): Smithsonian API returned records but no usable media URL in my parse; choose manually and check the rights field.
3. `next/font/local` snippet (4.2) and splitting `@theme` into `tokens.css` (7): not run.
4. First-load JS budget numbers (5.8): estimates, no production build measured.
5. ImageMagick ordered-dither one-liner (3.6): ImageMagick is not installed here.
6. The redrawn phone pixel glyph (3.5): bitmaps for mail, lock, stamp rendered fine; phone was redrawn after the first version failed to read and has not been rendered.
7. Figma MCP free-seat call limits (sources conflict), Subframe/Lovable/Magic Patterns pricing, and the Claude Design closure date (single source).
8. `InterceptScene.tsx` React wrapper (5.1): the timing and CSS were tested in plain HTML; the React sketch was not run.
9. Ramp endpoint strings in 5.6 and the product behaviors named in 5.5's honesty line: placeholders pending 01/03/08.
10. Exact hex status colors were checked for contrast, not for color-vision-deficiency simulation; glyphs and text labels carry the meaning for that reason.

### 8.3 Sources

- Greptile: https://greptile.com, https://www.greptile.com/blog/brand-refresh, https://www.pixeluplabs.com/case-studies/greptile
- References: https://oxide.computer, https://modal.com, https://ramp.com, https://increase.com, https://www.are.na, teenage.engineering, https://rauno.me, https://linear.app, https://resend.com
- Paper Shaders: https://github.com/paper-design/shaders
- Fonts: https://github.com/github/mona-sans, https://fonts.google.com/specimen/IBM+Plex+Mono, https://fontsource.org
- Tailwind v4 theme docs: https://tailwindcss.com/docs/theme
- Anthropic: https://claude.com/resources/articles/improving-frontend-design-through-skills
- AI-tell analyses: https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p, https://www.925studios.co/blog/ai-slop-design-tells
- Image model: https://fal.ai/models/fal-ai/nano-banana-pro
- Public-domain imagery: https://www.si.edu/openaccess, https://commons.wikimedia.org
- Agent 05 hand-off: `/home/user/countercall/research/05-app-ui.md` (section "Hand-offs")
