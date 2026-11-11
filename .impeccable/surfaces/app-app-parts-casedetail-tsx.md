---
version: 1
slug: "app-app-parts-casedetail-tsx"
primary_target: "app/(app)/_parts/CaseDetail.tsx"
related_targets: ["app/page.tsx","app/(app)/_parts/AppShell.tsx"]
---

## Scope
CounterCall app screens (cases list + case page, vendors, audit log, release drawer, demo panel) in Operate mode, and the landing page `/` in Persuade mode. One visual world for both. Redesign: the earlier brutalist "concrete bank hall" pass and the original graphite look are evidence only; the owner pinned Ramp's product UI as the direction.

Audience: hackathon judges on a recorded video (1280x720) and a projector, first time, seconds per screen. Job: understand that the money is frozen until a person says go. Constraint: all behavior, routes, replay URLs, events and numbers unchanged; components/** stay presentational for the Remotion video.

## Direction contract
THESIS: CounterCall should look like a feature inside Ramp's own product: Bill Pay's calm, warm-neutral, large-type pages, where a held bank-change request is just another item that needs a person. It refuses the AI-dashboard default (dark mode, rounded card soup, glowing pills, a status repeated four times).

OWN-WORLD: Ramp's product language, measured from ramp.com CSS and Ramp help-center screenshots. White pages, warm grey #F4F3EF sidebar and bands, text #2E2E28, olive-grey #707063, hairlines #EAE8E5, control borders #DBDACB, near-square buttons/inputs/banners (2px), fully round pills and avatars, one Solar lime #E4F222 primary per page, Blaze orange #E96516 (#A3460D for small text) for held money only, regular-weight headlines (Switzer standing in for Lausanne), amounts in the sans with tabular figures, thin 1.5px line icons, no shadows except the drawer.

STORY: A viewer lands on the case page: the vendor as the title, a Ramp banner that says what happened in one sentence, underline tabs for Email / Payments / Phone call / Result with one step open, and the held amount leading the "Case details" column. They understand the vendor was called on the number already on file and that only a person can release the money (the one lime button, then Ramp's approval drawer with a press-and-hold release).

FIRST VIEWPORT: App: left sidebar (company switcher, Cases/Vendors/Audit log with a lime count badge, the held total at the bottom), no top bar; page header = small breadcrumb, avatar + 40px regular title, lime primary at right; banner; tabs; content left, details right. Landing: black truth strip, nav with a black button, a 64px regular headline "Call the number you already have.", subcopy and two buttons, and the signature motion: a crisp mock of the CounterCall app in Ramp style playing the case story (email highlighted in lime, $24,800.00 freezing in Blaze, the number on file dialing, the transcript, the result banner).

FORM: Ramp product UI, pinned by the owner (a brief-pinned direction beats the roll; the original roll was seed:6a1bde64f288d289, superseded). Signature interaction: the case story told in place on one page (tabs that follow the live case, the held amount settling in, the result banner landing), and on the landing page the same story played once as a loop. Motion: Ramp's cubic-bezier(.4,0,.2,1), 150-300ms for UI, 400-700ms for story beats, reduced-motion = instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Lausanne is licensed by the owner as desktop OTF only (one weight); Switzer is used everywhere instead.
- Vendors page needs the live database; replay shows a notice.
