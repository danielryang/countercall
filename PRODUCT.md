# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: hackathon judges (BBS x Ramp "Automate the Old Way") seeing CounterCall for the first time, on a recorded 3:30-4:30 video or a projector at a live final. They have seconds per screen and no glossary. In the story, the operator is an accounts-payable clerk at a fictional company (Rice Robotics) who triages vendor email; that persona is the in-fiction user, not the one the screens are optimized for.

## Product Purpose
CounterCall reads AP email, detects vendor bank-change requests (the core business-email-compromise move), freezes the scheduled payments, phones the vendor on the number already on file (never a number from the email), and leaves the release of money to a person. Success: a first-time viewer can say what happened to a case, and why the money is safe, within a few seconds of seeing the screen.

## Positioning
The callback is automated, but the money is never released by software: the LLM only reports, fixed code decides, and a human releases. Every step is an event in an append-only, hash-chained log that the system re-verifies itself.

## Operating Context
- Demo stage is 1280x720 (recorded at DPR 2, also projected). Present mode (`P`) scales the frame to 115%.
- Recorded runs replay offline via `?replay=<run>&at=<n>`; the live view polls `/api/events`.
- Flows a viewer sees: a flagged email, payments put on hold, a live AI phone call, an outcome stamp (Verified / Blocked / Needs a person), and a human releasing money with a press-and-hold confirm.
- Secondary screens: vendors (numbers on file with provenance), audit (log check, event list), demo panel (inject a test email, reset, readiness).

## Capabilities and Constraints
- All behavior and data must survive any redesign: routes, replay URLs, events, reducer, release flow, demo panel, and every number.
- Money is never shown optimistically; status comes only from `case.state` events. Release is human-only.
- Phones are always masked; email is rendered as text, never HTML.
- `components/**` stay presentational (no `next/*`, no fetching) so the Remotion video project can import them.
- No new runtime dependency without a stated reason; fonts must be self-hosted (no font CDN).
- Labels that must stay truthful: REPLAY, SIMULATED, RAMP MOCK.

## Evidence on Hand
- Real recorded runs in `public/runs/`: `fraud-live`, `verified-live`, `email-live` (real calls / real email), plus generated `fraud`, `confirmed`, `voicemail`, `vague`, `impostor`.
- Verified numbers: eval 20/20 (N=20 fixtures), policy verifier 20,995,238 cases / 0 unsafe, simulation runs, hash-chained audit log. Two Acme bills of $12,400 = $24,800 held.
- No customers, testimonials or pricing exist; never invent them.

## Product Principles
1. The money is frozen until a person says go: every screen makes the held amount and who can release it obvious.
2. One story, four steps: email flagged, payments held, vendor called on the number we already had, result.
3. Show the mechanism, not claims: the real email, the real call, the real log.
4. Fail closed, visibly: unclear means held plus a task for a person.
5. Less on screen: one focal thing at a time; everything else on demand.

## Accessibility & Inclusion
Status is never colour alone (glyph + text). Reduced-motion branch for every animation. Text must stay legible after video compression and on a projector.
