// Landing sections (/). Pure and presentational: no next/*, no data fetching. Copy in ./copy.ts; the call transcripts arrive as props.
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CallOutcomes, type Outcome } from './CallOutcomes';
import { InterceptScene } from './InterceptScene';
import { CALL, CTA, HERO, HOW, LIVE_QUEUE_HREF, NAV, PROBLEM, RAMP, RECORDED_RUN_HREF, REPO_URL, STRIP, TRUST } from './copy';

export const THEMES = ['graphite', 'paper', 'cloud'] as const;
export type LandingTheme = (typeof THEMES)[number];

const wrap = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8';
const h2 = 'font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.03em]';
const btn = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium transition-colors duration-[var(--d-fast)] ease-[var(--ease-out)]';
const primary = `${btn} bg-fg text-surface hover:bg-fg-muted`;
const secondary = `${btn} border border-rule text-fg hover:bg-surface-raised`;

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 flex items-center gap-2 text-[13px] font-medium text-fg-muted"><i aria-hidden className="h-1.5 w-1.5 rounded-sm bg-fg" />{children}</p>;
}
function Mark() {
  return <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M6 0l6 6-6 6-6-6z" fill="currentColor" /></svg>;
}

export function Nav() {
  return (
    <>
      <div className="border-b border-rule bg-surface-sunk"><p className={`${wrap} py-2 text-center text-[12px] text-fg-muted`}>{STRIP}</p></div>
      <header className="sticky top-0 z-20 border-b border-rule bg-surface">
        <nav className={`${wrap} flex h-14 items-center gap-6`} aria-label="Main">
          <a href="#top" className="flex items-center gap-2.5" aria-label="CounterCall home"><Mark /><span className="display text-[14px] uppercase">CounterCall</span></a>
          <div className="ml-4 hidden items-center gap-5 text-[14px] text-fg-muted md:flex">
            {NAV.map((n) => <a key={n.href} href={n.href} className="hover:text-fg">{n.label}</a>)}
          </div>
          <a href={LIVE_QUEUE_HREF} className="ml-auto text-[14px] text-fg-muted hover:text-fg">{HERO.secondary}</a>
        </nav>
      </header>
    </>
  );
}

export function Hero() {
  return (
    <section id="top" className={`${wrap} grid items-center gap-10 pb-20 pt-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-14 lg:pb-28 lg:pt-20`}>
      <div className="min-w-0 animate-rise">
        <Eyebrow>{HERO.eyebrow}</Eyebrow>
        <h1 className="font-display text-[clamp(2.75rem,6.2vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">{HERO.title}</h1>
        <p className="mt-6 max-w-[38ch] text-[18px] leading-7 text-fg-muted sm:text-[20px] sm:leading-8">{HERO.sub}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={RECORDED_RUN_HREF} className={primary}>{HERO.primary}<span aria-hidden>→</span></a>
          <a href={LIVE_QUEUE_HREF} className={secondary}>{HERO.secondary}</a>
        </div>
        <p className="cap mt-3">{HERO.primaryNote}</p>
      </div>
      <InterceptScene />
    </section>
  );
}

export function Problem() {
  return (
    <section className="border-t border-rule">
      <div className={`${wrap} py-20 lg:py-28`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <div>
            <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
            <h2 className={h2}>{PROBLEM.title.map((l) => <span key={l} className="block">{l}</span>)}</h2>
          </div>
          <p className="self-end text-[18px] leading-8 text-fg-muted lg:max-w-[46ch]">{PROBLEM.lead}</p>
        </div>
        <div className="mt-14 grid border-y border-rule md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
          {PROBLEM.stats.map((s, k) => (
            <div key={s.value} className={`py-7 md:px-7 ${k > 0 ? 'border-t border-rule md:border-l md:border-t-0' : 'md:pl-0'}`}>
              <div className="font-mono text-[clamp(2.75rem,5vw,4.25rem)] font-medium leading-none tracking-[-0.04em] tabular-nums">{s.value}<sup className="ml-1 align-super text-[13px] font-normal tracking-normal text-fg-muted"><a href={`#src-${s.ref}`} aria-label={`Source ${s.ref}`}>{s.ref}</a></sup></div>
              <p className="mt-4 max-w-[30ch] text-[15px] leading-6">{s.label}</p>
              {s.note && <p className="cap mt-2">{s.note}</p>}
            </div>
          ))}
        </div>
        <ol className="mt-5 space-y-1 text-[12px] leading-5 text-fg-muted">
          {PROBLEM.sources.map((s) => (
            <li key={s.n} id={`src-${s.n}`}><span className="font-mono">{s.n}</span>{'  '}<a href={s.href} className="underline decoration-rule underline-offset-4 hover:text-fg" rel="noreferrer">{s.text}</a></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const [detect, hold, call, decide] = HOW.steps;
  const head = (s: typeof detect) => (<><div className="flex items-baseline gap-3"><span className="font-mono text-[13px] text-fg-muted">{s.n}</span><h3 className="text-[22px] font-semibold tracking-[-0.02em]">{s.title}</h3></div><p className="mt-2 max-w-[44ch] text-[15px] leading-6 text-fg-muted">{s.body}</p></>);
  return (
    <section id="how" className="scroll-mt-16 border-t border-rule">
      <div className={`${wrap} py-20 lg:py-28`}>
        <Eyebrow>{HOW.eyebrow}</Eyebrow>
        <h2 className={`${h2} max-w-[18ch]`}>{HOW.title}</h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-5">
            {head(detect)}
            <dl className="mt-6 space-y-1.5 font-mono text-[13px]">
              <div className="flex gap-3"><dt className="w-24 shrink-0 font-sans text-fg-muted">{HOW.diff.onFileLabel}</dt><dd>{HOW.diff.onFile}</dd></div>
              <div className="flex gap-3"><dt className="w-24 shrink-0 font-sans text-fg-muted">{HOW.diff.inEmailLabel}</dt><dd><span className="ev">{HOW.diff.inEmail}</span></dd></div>
            </dl>
          </Card>
          <Card className="p-6 lg:col-span-7">
            {head(hold)}
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-surface px-4 py-3">
              <span className="text-[14px]">Acme Corp · 2 invoices</span>
              <span className="frozen rounded-sm px-1.5 font-mono text-[18px] font-medium tabular-nums">$24,800.00</span>
              <span className="ml-auto"><Chip state="held" /></span>
            </div>
          </Card>
          <Card className="p-6 lg:col-span-7">
            {head(call)}
            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-fg/40 bg-surface px-4 py-3">
              <span className="cap">{HOW.number.label}</span>
              <span className="font-mono text-[18px] font-medium tabular-nums">{HOW.number.value}</span>
              <span className="text-[13px] text-fg-muted">{HOW.number.note}</span>
            </div>
          </Card>
          <Card className="p-6 lg:col-span-5">
            {head(decide)}
            <div className="mt-6 flex flex-wrap gap-2"><Chip state="fraud_blocked" /><Chip state="awaiting_approval" /><Chip state="needs_human" /></div>
            <p className="cap mt-3">{HOW.decide}</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function TheCall({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <section id="call" className="scroll-mt-16 border-t border-rule">
      <div className={`${wrap} py-20 lg:py-28`}>
        <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <div><Eyebrow>{CALL.eyebrow}</Eyebrow><h2 className={h2}>{CALL.title}</h2></div>
          <p className="self-end text-[18px] leading-8 text-fg-muted lg:max-w-[46ch]">{CALL.lead}</p>
        </div>
        <CallOutcomes outcomes={outcomes} />
      </div>
    </section>
  );
}

export function Trust() {
  return (
    <section id="trust" className="scroll-mt-16 border-t border-rule">
      <div className={`${wrap} grid gap-12 py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-28`}>
        <div>
          <Eyebrow>{TRUST.eyebrow}</Eyebrow>
          <h2 className={`${h2} max-w-[16ch]`}>{TRUST.title}</h2>
          <div className="mt-10 rounded-xl border border-rule bg-surface-raised p-6">
            <h3 className="text-[16px] font-semibold">{TRUST.priorTitle}</h3>
            <p className="mt-2 text-[15px] leading-6 text-fg-muted">{TRUST.prior}</p>
            <a href={TRUST.priorSource.href} rel="noreferrer" className="cap mt-3 inline-block underline decoration-rule underline-offset-4 hover:text-fg">Source: {TRUST.priorSource.text}</a>
          </div>
        </div>
        <ol className="self-start">
          {TRUST.rules.map((r, k) => (
            <li key={r.title} className={`grid grid-cols-[36px_minmax(0,1fr)] gap-2 py-6 ${k > 0 ? 'border-t border-rule' : 'pt-1'}`}>
              <span className="font-mono text-[15px] text-fg-muted">{k + 1}</span>
              <div><p className="text-[18px] font-semibold leading-7">{r.title}</p><p className="mt-1 text-[15px] leading-6 text-fg-muted">{r.body}</p></div>
            </li>
          ))}
          <li className="cap border-t border-rule pt-4">{TRUST.limit}</li>
        </ol>
      </div>
    </section>
  );
}

export function Ramp() {
  return (
    <section id="ramp" className="scroll-mt-16 border-t border-rule">
      <div className={`${wrap} py-20 lg:py-28`}>
        <Eyebrow>{RAMP.eyebrow}</Eyebrow>
        <h2 className={`${h2} max-w-[22ch]`}>{RAMP.title}</h2>
        <p className="mt-6 flex max-w-[64ch] flex-wrap items-center gap-3 text-[16px] leading-7 text-fg-muted"><span className="chip-plain" data-variant="dashed">{RAMP.chip}</span>{RAMP.truth}</p>
        <ol className="mt-12 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1.15fr_auto_1fr] lg:items-stretch">
          {RAMP.nodes.map((n, k) => (
            <li key={n.title} className="contents">
              {k > 0 && <span aria-hidden className="flex items-center justify-center py-1 font-mono text-[15px] text-fg-muted lg:px-1 lg:py-0"><span className="lg:hidden">↓</span><span className="hidden lg:inline">→</span></span>}
              <div className={`rounded-xl border p-5 ${n.ours ? 'border-fg bg-surface-raised' : 'border-rule'}`}>
                <p className="text-[16px] font-semibold leading-6">{n.title}</p>
                <p className="mt-2 break-words font-mono text-[12px] leading-5 text-fg-muted">{n.api}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[70ch] text-[14px] leading-6 text-fg-muted">{RAMP.note}</p>
        <p className="cap mt-2">{RAMP.trademark}</p>
      </div>
    </section>
  );
}

export function Footer({ theme }: { theme: LandingTheme }) {
  return (
    <footer className="overflow-hidden border-t border-rule bg-surface-raised">
      <div className={`${wrap} pb-10 pt-20 lg:pt-28`}>
        <h2 className="font-display text-[clamp(2.75rem,7vw,6rem)] font-semibold leading-[0.95] tracking-[-0.04em]">{CTA.title}</h2>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={RECORDED_RUN_HREF} className={primary}>{CTA.primary}<span aria-hidden>→</span></a>
          <a href={REPO_URL} className={secondary} rel="noreferrer">{CTA.code}</a>
        </div>
        <div className="mt-20 flex flex-col gap-3 border-t border-rule pt-6 text-[13px] text-fg-muted md:flex-row md:items-center md:gap-6">
          <span>{CTA.team}</span>
          <a href={REPO_URL} className="hover:text-fg" rel="noreferrer">github.com/danielryang/countercall</a>
          <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-fg" rel="noreferrer">{CTA.license}</a>
          <span className="flex items-center gap-3 md:ml-auto">{CTA.themes}
            {THEMES.map((t) => <a key={t} href={`/?theme=${t}`} aria-current={t === theme ? 'true' : undefined} className={t === theme ? 'text-fg underline underline-offset-4' : 'hover:text-fg'}>{t}</a>)}
          </span>
        </div>
        <p className="cap mt-3">{CTA.fine}</p>
      </div>
      {/* the closing poster gesture: a giant wordmark, cropped by the page edge */}
      <div aria-hidden className="h-[9.5vw] select-none overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="display whitespace-nowrap text-center text-[14.5vw] leading-[0.8] text-fg/10">CounterCall</div>
      </div>
    </footer>
  );
}
