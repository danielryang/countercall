---
name: CounterCall
description: A held bank-change request shown as just another item in Ramp's Bill Pay, waiting for a person.
colors:
  ink: "#2E2E28"
  ink-muted: "#707063"
  button-black: "#1A1919"
  white: "#FFFFFF"
  warm-gray: "#F4F3EF"
  warm-gray-active: "#EBE6E2"
  hairline: "#EAE8E5"
  control-border: "#DBDACB"
  gray-dark: "#6E6A68"
  solar: "#E4F222"
  solar-light: "#F5FF78"
  blaze: "#E96516"
  blaze-soft: "#FCE8DC"
  blaze-ink: "#A3460D"
  review-banner: "#FEFFE4"
  review-banner-rule: "#A77C3B"
  review-banner-ink: "#82673C"
  mustard: "#E7DAA0"
  approve: "#1F833A"
  verified-soft: "#F7FFF9"
  verified-rule: "#A3C1A8"
  blocked: "#C0522E"
  blocked-soft: "#FEF8F4"
  blocked-rule: "#E8C2B4"
  review-blue: "#3D67B5"
  review-blue-soft: "#E4EBF6"
  avatar-periwinkle: "#ABB6D5"
  avatar-sage: "#D1DBCB"
  avatar-mauve: "#DFC2D5"
typography:
  hero:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 4.7vw, 3.75rem)"
    fontWeight: 450
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 450
    lineHeight: "48px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 450
    lineHeight: "40px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "28px"
  banner-title:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 550
    lineHeight: "24px"
  body:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  caption:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: "1.125rem"
    letterSpacing: "0"
  figures:
    fontFamily: "Switzer, Lausanne, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    fontFeature: "\"tnum\" on, \"ss01\" on"
rounded:
  sm: "2px"
  md: "2px"
  lg: "4px"
  xl: "6px"
  full: "9999px"
spacing:
  page-x: "40px"
  sidebar-x: "12px"
  card-x: "20px"
  drawer-x: "32px"
  banner-y: "14px"
  stack: "24px"
components:
  button-primary:
    backgroundColor: "{colors.solar}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.solar-light}"
  button-outline:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.warm-gray}"
  button-small:
    rounded: "{rounded.sm}"
    padding: "6px 14px"
    height: "36px"
  button-landing-primary:
    backgroundColor: "{colors.button-black}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "0 20px"
    height: "48px"
  button-landing-primary-hover:
    backgroundColor: "{colors.gray-dark}"
  chip-held:
    backgroundColor: "{colors.blaze-soft}"
    textColor: "{colors.blaze-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 10px 0 8px"
    height: "26px"
  chip-verified:
    backgroundColor: "{colors.verified-soft}"
    textColor: "{colors.approve}"
    rounded: "{rounded.full}"
    height: "26px"
  chip-blocked:
    backgroundColor: "{colors.blocked-soft}"
    textColor: "{colors.blocked}"
    rounded: "{rounded.full}"
    height: "26px"
  chip-needs-review:
    backgroundColor: "{colors.mustard}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "26px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "16px 20px"
  banner-review:
    backgroundColor: "{colors.review-banner}"
    textColor: "{colors.review-banner-ink}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  banner-blocked:
    backgroundColor: "{colors.blocked-soft}"
    textColor: "{colors.blocked}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  banner-verified:
    backgroundColor: "{colors.verified-soft}"
    textColor: "{colors.approve}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  banner-progress:
    backgroundColor: "{colors.warm-gray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 20px"
  held-slab:
    backgroundColor: "{colors.blaze-soft}"
    textColor: "{colors.blaze-ink}"
    typography: "{typography.figures}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  nav-item:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  nav-item-active:
    backgroundColor: "{colors.warm-gray-active}"
    textColor: "{colors.ink}"
  nav-count-badge:
    backgroundColor: "{colors.solar}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 8px"
  avatar:
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "44px"
---

# Design System: CounterCall

## Overview

**Creative North Star: "A Feature Inside Bill Pay"**

CounterCall looks like a page Ramp could have shipped: white pages, a warm-gray sidebar, warm olive-gray secondary text, hairline dividers, near-square controls and fully round pills. A held bank-change request is shown as one more item that needs a person, not as an alarm. The calm is the argument. The money is frozen, the facts are on the page, and the one lime button belongs to a human.

Density is low and type is large, because the real audience watches a 1280x720 recording or a projector with seconds per screen. Each case page tells one story (email flagged, payments held, vendor called on the number already on file, result) along one continuous timeline rail, with one step open beneath it. A single sentence banner says what happened. Held money is the only warm-orange thing on the screen. Headlines are regular weight (450) and tightly tracked. Amounts and ids stay in the sans with tabular figures, the way Ramp sets them.

There is one light look, used by the landing page, the app and the Remotion video. The `[data-theme]` attributes are inert. Switzer (ITF Free Font License) stands in for Ramp's licensed Lausanne. `scripts/fetch-fonts.mjs` fetches it at build into the gitignored `public/fonts`, and it is never committed. The system rejects the AI-dashboard default: dark mode, rounded card soup, glowing pills, and a status repeated four times.

**Key Characteristics:**
- White ground, warm-gray sidebar and bands, ink text at 5:1+ muted secondary.
- Near-square controls, banners and inputs (2px), round pills and avatars, cards at 6px.
- One Solar lime primary action per page. Lime also marks evidence and the nav count.
- Blaze orange is reserved for held money.
- Flat surfaces with hairline borders. The release drawer is the only lifted surface.
- Regular-weight display type, sentence case, tabular figures for money.
- The case's steps as one continuous timeline rail, ink up to where the case is.
- Thin 1.5px-stroke inline SVG line icons.

## Colors

The palette is a warm neutral Ramp palette with one acid accent and one warm alarm, and both are rationed.

### Primary
- **Solar Lime** (solar): the attention colour. It fills the one primary action on an app page, highlights suspicious words in the email (the highlighter sweep), marks text selection, and fills the sidebar count badge. Ink text sits on it, never white. The hover state lifts to **Pale Solar** (solar-light).

### Secondary
- **Blaze Orange** (blaze): held money. It is used for the frozen-money hatch pattern and the held status. As text on white or on its tint it darkens to **Blaze Ink** (blaze-ink, 5.6:1), which is used for the held total in the sidebar, the "On hold" amount and the held pill. **Blaze Tint** (blaze-soft) is the ground of the held pill and the held-amount slab.

### Tertiary
- **Status family** (always a tint ground plus dark text plus a glyph):
  - Verified: Approve Green (approve) on Mint Wash (verified-soft) with a Sage Rule (verified-rule).
  - Blocked: Brick (blocked) on Blush Wash (blocked-soft) with a Rose Rule (blocked-rule).
  - Needs a person: Ink on Mustard (mustard) for pills.
  - The pending-review banner: Cream (review-banner) with a Bronze Rule (review-banner-rule) and Bronze Ink (review-banner-ink).
  - Review Blue (review-blue on review-blue-soft) is defined for "needs a person" text.
- **Avatar pastels** (avatar-periwinkle, avatar-sage, avatar-mauve): initials discs for vendors without a logo. The tint is picked stably from the name.

### Neutral
- **Ink** (ink): all primary text.
- **Olive Gray** (ink-muted): secondary text, labels, captions and inactive tabs (5.0:1).
- **White** (white): the page ground and card ground.
- **Warm Gray** (warm-gray): the sidebar, the in-progress banner, the landing bands and raised wells.
- **Warm Gray Active** (warm-gray-active): the active sidebar row and sunk surfaces.
- **Hairline** (hairline): dividers and card borders, one per surface.
- **Control Border** (control-border): outlined buttons, inputs, the company switcher and the `kbd` key.
- **Button Black** (button-black): the landing page's buttons, the truth strip and the "ours" comparison card. Inside the app it appears only as the replay progress bar and dot.

### Named Rules
**The One Lime Rule.** An app page carries at most one lime button. Lime elsewhere marks evidence or a count and is never a second call to action.

**The Blaze Means Held Rule.** Blaze orange in any form (hatch, tint, ink) says "this money is frozen". Never use it for a warning, a hover or decoration.

**The Never Colour Alone Rule.** Every status pairs its tint with a glyph and a word: pause bars for held, a check for verified, a cross for blocked, a triangle for needs a person.

## Typography

**Display Font:** Switzer (with Lausanne, then ui-sans-serif and system-ui)
**Body Font:** Switzer (same stack)
**Label/Mono Font:** none distinct. The `font-mono` role is Switzer with tabular figures, used for money, ids and clocks.

**Character:** One grotesk family does everything, as Ramp's does. Hierarchy comes from size and a narrow weight band (400 to 600), not from contrast between faces. Stylistic set `ss01` is on globally.

### Hierarchy
- **Hero** (450, clamp(2.75rem, 4.7vw, 3.75rem), 1.04): the landing headline only. Landing section heads use clamp(2.25rem, 4vw, 3rem), and stat figures use clamp(3rem, 5vw, 4.25rem).
- **Display** (450, 44px/48px, -0.02em): page titles on Cases, Vendors and Audit log. The case page title is 40px/46px beside a 44px avatar.
- **Headline** (450, 32px/40px): the release drawer title and the demo sign-in title. Quoted call answers and the held slab use 26px.
- **Title** (500, 20px/28px): section heads such as "Case details", "Vendor details" and the drawer sections.
- **Banner title** (550, 17px/24px): the one-sentence banner headline.
- **Body** (400, 15px/22px): the working size for tabs, nav, table rows, the email and transcripts. Landing body runs at 16px with a 44ch measure.
- **Caption** (400, 14px/20px, Olive Gray): quiet context.
- **Label** (500, 13px/18px, Olive Gray): field labels and chips. Sentence case, no tracking.

### Named Rules
**The Regular Headline Rule.** Headlines are 450 weight and tightly tracked (-0.02em). Size carries the hierarchy, not boldness.

**The Sentence Case Rule.** Every label, tab, button and chip is in sentence case at zero tracking. Nothing is uppercase-tracked.

**The Tabular Money Rule.** Amounts, case ids and clocks use tabular figures in the sans.

## Layout

The app is a fixed 232px warm-gray sidebar (no top bar) beside a white content column with 40px page padding. The sidebar holds the mark, the company switcher, Cases / Vendors / Audit log with a lime count badge, and the held total pinned at the bottom. A 40px footer carries the replay controls and the present hint.

A case page stacks a small back breadcrumb, the avatar and title, the banner and the timeline rail of the case's steps. Below the rail, the open step sits on the left and a narrow "Case details" column sits on the right, led by the held amount. The main story beats fit the 1280x720 stage with no scroll. Present mode (`P`) zooms the app to 115% and collapses the sidebar to a 64px icon rail.

The landing page is a centered column (max 1200px, 16/24/32px gutters at sm/lg). Its order is a black truth strip, a nav, then the hero beside the replayed app mock. It responds at Tailwind's sm/md/lg breakpoints. The app shell is desktop-first and does not adapt to phone width.

Vertical rhythm is about 24px between blocks inside a page. Cards pad 16-20px, and drawer sections pad 24px by 32px.

## Elevation & Depth

The system is flat. Depth comes from tone: the white page, the warm-gray sidebar and wells, and the warm-gray-active selection, separated by single hairlines. Nothing in `components/**` or the app parts casts a shadow. The status pills for verified and blocked draw their 1px rule as an inset ring, which reads as a border, not a lift.

### Shadow Vocabulary
- **Drawer** (Tailwind `shadow-lg`, in the generated `components/shadcn/sheet.tsx`): only on the release drawer, which slides over a dimmed page.

### Named Rules
**The Tone Not Shadow Rule.** Separate surfaces with a tone step or one hairline. The release drawer is the only surface allowed to float.

## Shapes

Corners are nearly square. Buttons, inputs, banners, nav rows and the switcher use 2px corners. Small wells and the waterfall bars use 2-4px. Cards and the landing panels use 6px. Pills, count badges, avatars and status dots are fully round. The mark is a dark rounded tile with a short lime bar. The radius scale stops at 6px, and arbitrary radii are linted out. The frozen-money hatch (Blaze diagonals at 45 degrees) is the one recurring pattern, and it survives greyscale and video compression.

## Components

### Buttons
Ramp-plain: a medium-weight label, a near-square corner and no ornament.
- **Shape:** near-square (2px) in the app. On the landing page, buttons use 6px corners and are 48px tall.
- **Primary (app):** Solar lime with ink text and a 44px minimum height, 15px/500 label. One per page.
- **Outline:** a white ground with the control-border hairline and ink text. Hover fills it Warm Gray.
- **Small:** 36px tall, 14px label.
- **Landing primary:** Button Black with white text. Hover is Gray Dark.
- **Hover / Focus:** a 150ms colour change on the standard ease. Focus is a 2px ink outline offset by 2px.
- **Disabled:** Warm Gray ground, Olive Gray text and a hairline border.
- **Hold to release:** the release button needs an 800ms press-and-hold, by pointer or keyboard. It is the only control that moves money.

### Chips
- **Style:** a round pill 26px tall with a 13px/500 label, a tint ground, dark text and an 8px leading glyph.
- **State:** held (pause bars, Blaze), calling (a blinking dot on the Blaze tint), verified (a check, green with a sage ring), blocked (a cross, brick with a rose ring), needs a person (a triangle on mustard). Plain chips (Warm Gray) add dashed, danger and quiet variants for non-status tags.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** White on white pages. Warm Gray for landing panels.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** one hairline.
- **Internal Padding:** 16-20px, with the title at 16px/550. Cards never nest.

### Inputs / Fields
- **Style:** a white ground, a control-border hairline and 2px corners. The company switcher in the sidebar sets the pattern.
- **Focus:** a 2px ink outline. The selected radio option in the drawer takes a 1px ink border.

### Navigation
- **Sidebar:** 15px rows with 18px line icons at a 1.5 stroke. Inactive rows are Olive Gray. Hover and active fill Warm Gray Active with ink text. The Cases row carries a lime count pill.
- **Steps:** the case's steps are labels on a timeline, not tabs (see Timeline Rail). Clicking a step label opens that step; the open one sits on a Warm Gray ground.
- **Landing nav:** text links in Olive Gray with a black button at the right.

### Status Banner (signature)
A square tinted strip with a 20px line icon, a 17px/550 headline sentence, a 15px sub-line and the case clock at the right. It has tones for review (cream and bronze), blocked, verified and in progress (Warm Gray). A banner that lands with the final result uses the 300ms stamp entrance.

### Held Amount Slab and Hatch (signature)
The held amount leads the case details in Blaze Ink at 30px with tabular figures, with "Held since mm:ss" under it. It settles in with the 450ms "pour" (a fade and a 6px drop). Each invoice the hold covers is listed under it with the Blaze hatch; after release the squares turn green and the amount turns to ink.

### Timeline Rail (signature)
The case's steps read as one sequence: "Step N", the step name (16px) and a status word ("Flagged, payments held", "On the phone") above one continuous 3px rail, and the time each step happened below it. The rail is solid ink up to where the case is and Control Border grey after it; a 2px x 13px ink tick marks each step's start, and the same tick marks where the case is. While a step is in progress, the ink line and its tick move forward through it: the phone call moves with the call itself (just inside the step while it rings, then one notch for each line as it appears in the transcript, up to 90% until the outcome), and a step that lasts seconds (reading the email) creeps on a clock. When the case moves on they glide to the next step (700ms, standard ease). For someone watching a call (live, or a replay playing), the transcript types out one line at a time in the order spoken, at about three times speaking pace: an answer never appears before its question has finished. When the call ends, the case stays on the call until its last line has been readable for 3.5 seconds, then the result replaces it all at once (banner, steps, actions); the banner meanwhile reads "Call with {vendor} ended". A reload or a paused replay frame shows everything at once; under reduced motion the lines appear whole, still in order (lib/reveal.ts). The step in progress is labelled "Now". Finished: the whole rail is ink and the position tick goes away. Reduced motion: no creep, the line jumps. The landing page mock uses the same rail at a smaller size. The payment hold is not a step: it lands within a second and lasts until a person releases the money, so step 1's status word carries it and the case details show it (the held amount in Blaze, "Held since 00:10", and each invoice with the frozen hatch).

### Evidence Highlight (signature)
Suspicious words in the email are swept with a Solar lime marker in reading order (700ms, staggered). Call answers are swept rose for "no" and mint for "yes". Pointing at a reason in "Why it was flagged" outlines its span in ink.

## Do's and Don'ts

### Do:
- **Do** take every colour, radius and duration from `app/globals.css`. `npm run lint:ui` (`scripts/check-ui.sh`) fails on hex, rgb() or hsl() literals, arbitrary radii, shadows and gradients, transition-all, literal durations, and Tailwind default palette classes anywhere outside `app/globals.css`.
- **Do** keep one lime primary action per app page.
- **Do** use Blaze (hatch, tint, Blaze Ink) only where money is held.
- **Do** pair every status tint with a glyph and a word.
- **Do** set money, ids and clocks with tabular figures in Switzer.
- **Do** use the motion tokens: the standard ease cubic-bezier(.4,0,.2,1), 150-300ms for UI and 400-700ms for story beats, at most 8px of travel, and an instant reduced-motion branch.
- **Do** keep `components/**` presentational (no `next/*`, no fetching), because the Remotion project in `video/` imports them.
- **Do** self-host Switzer through `scripts/fetch-fonts.mjs` into gitignored `public/fonts`.

### Don't:
- **Don't** commit the font files, add a font CDN, or add a second typeface.
- **Don't** add a theme, a dark mode or a second look. The `.night` surface is reserved for the landing call widget and the video end cards.
- **Don't** add shadows or gradients to cards, buttons or pills. The drawer is the one exception.
- **Don't** use a radius above 6px except for full rounds.
- **Don't** bold headlines or uppercase-track labels.
- **Don't** put white text on lime, or let lime become a second call to action.
- **Don't** restate a case's status four ways on one screen. The banner sentence and the step's status word carry it.
- **Don't** draw the case's steps as tabs, arrows or connected circles. They are labels on one continuous timeline rail.
