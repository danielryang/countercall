// Landing sections (/), in ramp.com's language: a black truth strip, a white nav with one black button, large regular-weight headlines, warm-grey tiles
// with no borders, hairline-ruled stat rows, and one dark section (the call). Pure and presentational: no next/*, no data fetching. Copy in ./copy.ts;
// the call transcripts arrive as props.
import type { ReactNode } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Mark } from '@/components/ui/Mark';
import { CallOutcomes, type Outcome } from './CallOutcomes';
import { InterceptScene } from './InterceptScene';
import { CALL, CTA, HERO, HOW, LIVE_QUEUE_HREF, NAV, PROBLEM, RAMP, RECORDED_RUN_HREF, REPO_URL, STRIP, TRUST } from './copy';

const wrap = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8';
const h2 = 'display text-[clamp(2.25rem,4vw,3rem)] leading-[1.06]';
const lead = 'text-[18px] leading-7 text-fg-muted';
const btn = 'inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[15px] font-[500] transition-colors duration-[var(--d-fast)] ease-[var(--ease-out)]';   // a button label never wraps
const primary = `${btn} bg-black text-white hover:bg-gray-dark`;
const secondary = `${btn} border border-rule-strong bg-surface text-fg hover:bg-surface-raised`;

/** A ramp.com tile: warm grey, no border, flat. */
function Tile({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-surface-raised ${className}`}>{children}</div>;
}
/** A thin line check, the same family as the app's icons. */
function Check() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-1 shrink-0 text-verified"><circle cx="10" cy="10" r="7.5" /><path d="M6.6 10.2l2.3 2.3 4.6-4.8" /></svg>;
}

export function Nav() {
  return (
    <>
      <div className="bg-black"><p className={`${wrap} py-2 text-center text-[13px] text-white`}>{STRIP}</p></div>
      <header className="sticky top-0 z-20 border-b border-rule bg-surface">
        <nav className={`${wrap} flex h-16 items-center gap-6`} aria-label="Main">
          <a href="#top" className="flex items-center gap-2.5" aria-label="CounterCall home"><Mark /><span className="text-[17px] font-[600] tracking-[-0.01em]">CounterCall</span></a>
          <div className="ml-6 hidden items-center gap-7 text-[15px] text-fg-muted md:flex">
            {NAV.map((n) => <a key={n.href} href={n.href} className="hover:text-fg">{n.label}</a>)}
          </div>
          <a href={LIVE_QUEUE_HREF} className="ml-auto inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-xl bg-black px-4 text-[15px] font-[500] text-white transition-colors duration-[var(--d-fast)] hover:bg-gray-dark">{HERO.secondary}</a>
        </nav>
      </header>
    </>
  );
}

export function Hero() {
  return (
    <section id="top" className={`${wrap} grid items-center gap-10 pb-16 pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pb-24 lg:pt-12`}>
      <div className="min-w-0">
        <h1 className="display text-[clamp(2.75rem,4.7vw,3.75rem)] leading-[1.04]">{HERO.title}</h1>
        <p className={`mt-5 max-w-[36ch] ${lead}`}>{HERO.sub}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={RECORDED_RUN_HREF} className={primary}>{HERO.primary}<span aria-hidden>{'→'}</span></a>
          <a href={LIVE_QUEUE_HREF} className={secondary}>{HERO.secondary}</a>
        </div>
        <p className="mt-3 text-[14px] text-fg-muted">{HERO.primaryNote}</p>
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
          <h2 className={h2}>{PROBLEM.title.map((l) => <span key={l} className="block">{l}</span>)}</h2>
          <p className={`self-end lg:max-w-[46ch] ${lead}`}>{PROBLEM.lead}</p>
        </div>
        <div className="mt-14 grid border-y border-rule md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
          {PROBLEM.stats.map((s, k) => (
            <div key={s.value} className={`py-8 md:px-8 ${k > 0 ? 'border-t border-rule md:border-l md:border-t-0' : 'md:pl-0'}`}>
              <div className="display text-[clamp(3rem,5vw,4.25rem)] leading-none tabular-nums">{s.value}<sup className="ml-1 align-super text-[14px] tracking-normal text-fg-muted"><a href={`#src-${s.ref}`} aria-label={`Source ${s.ref}`}>{s.ref}</a></sup></div>
              <p className="mt-4 max-w-[30ch] text-[16px] leading-6">{s.label}</p>
              {s.note && <p className="mt-2 text-[14px] text-fg-muted">{s.note}</p>}
            </div>
          ))}
        </div>
        <ol className="mt-5 space-y-1 text-[13px] leading-5 text-fg-muted">
          {PROBLEM.sources.map((s) => (
            <li key={s.n} id={`src-${s.n}`}><span className="font-mono">{s.n}</span>{'  '}<a href={s.href} className="underline decoration-rule-strong underline-offset-4 hover:text-fg" rel="noreferrer">{s.text}</a></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const [detect, hold, call, decide] = HOW.steps;
  const head = (s: typeof detect) => (<><h3 className="text-[26px] font-[450] leading-8 tracking-[-0.01em]">{s.title}</h3><p className="mt-2 max-w-[44ch] text-[16px] leading-6 text-fg-muted">{s.body}</p></>);
  return (
    <section id="how" className="scroll-mt-16 border-t border-rule">
      <div className={`${wrap} py-20 lg:py-28`}>
        <h2 className={`${h2} max-w-[18ch]`}>{HOW.title}</h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          <Tile className="p-8 lg:col-span-5">
            {head(detect)}
            <dl className="mt-6 space-y-2 text-[15px]">
              <div className="flex gap-3"><dt className="w-28 shrink-0 text-fg-muted">{HOW.diff.onFileLabel}</dt><dd className="font-mono">{HOW.diff.onFile}</dd></div>
              <div className="flex gap-3"><dt className="w-28 shrink-0 text-fg-muted">{HOW.diff.inEmailLabel}</dt><dd className="font-mono"><span className="ev">{HOW.diff.inEmail}</span></dd></div>
            </dl>
          </Tile>
          <Tile className="p-8 lg:col-span-7">
            {head(hold)}
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-surface px-4 py-3">
              <span className="text-[15px]">Acme Corp {'·'} 2 invoices</span>
              <span className="font-mono text-[20px] text-blaze-ink">$24,800.00</span>
              <span className="ml-auto"><Chip state="held" /></span>
            </div>
          </Tile>
          <Tile className="p-8 lg:col-span-7">
            {head(call)}
            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-surface px-4 py-3">
              <span className="text-[15px] text-fg-muted">{HOW.number.label}</span>
              <span className="font-mono text-[20px]">{HOW.number.value}</span>
              <span className="text-[14px] text-fg-muted">{HOW.number.note}</span>
            </div>
          </Tile>
          <Tile className="p-8 lg:col-span-5">
            {head(decide)}
            <div className="mt-6 flex flex-wrap gap-2"><Chip state="fraud_blocked" /><Chip state="awaiting_approval" /><Chip state="needs_human" /></div>
            <p className="mt-3 text-[14px] text-fg-muted">{HOW.decide}</p>
          </Tile>
        </div>
      </div>
    </section>
  );
}

export function TheCall({ outcomes }: { outcomes: Outcome[] }) {
  return (
    // the page's one dark section, like ramp.com's
    <section id="call" className="night scroll-mt-16">
      <div className={`${wrap} py-20 lg:py-28`}>
        <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <h2 className={h2}>{CALL.title}</h2>
          <p className={`self-end lg:max-w-[46ch] ${lead}`}>{CALL.lead}</p>
        </div>
        <CallOutcomes outcomes={outcomes} />
      </div>
    </section>
  );
}

export function Trust() {
  return (
    <section id="trust" className="scroll-mt-16">
      <div className={`${wrap} grid gap-12 py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-28`}>
        <div>
          <h2 className={`${h2} max-w-[16ch]`}>{TRUST.title}</h2>
          <Tile className="mt-10 p-7">
            <h3 className="text-[18px] font-[500]">{TRUST.priorTitle}</h3>
            <p className="mt-2 text-[16px] leading-6 text-fg-muted">{TRUST.prior}</p>
            <a href={TRUST.priorSource.href} rel="noreferrer" className="mt-3 inline-block text-[14px] text-fg-muted underline decoration-rule-strong underline-offset-4 hover:text-fg">Source: {TRUST.priorSource.text}</a>
          </Tile>
        </div>
        <ul className="self-start">
          {TRUST.rules.map((r, k) => (
            <li key={r.title} className={`flex gap-3 py-6 ${k > 0 ? 'border-t border-rule' : 'pt-1'}`}>
              <Check />
              <div><p className="text-[20px] font-[450] leading-7">{r.title}</p><p className="mt-1 text-[16px] leading-6 text-fg-muted">{r.body}</p></div>
            </li>
          ))}
          <li className="border-t border-rule pt-4 text-[14px] text-fg-muted">{TRUST.limit}</li>
        </ul>
      </div>
    </section>
  );
}

export function Ramp() {
  return (
    <section id="ramp" className="scroll-mt-16 border-t border-rule">
      <div className={`${wrap} py-20 lg:py-28`}>
        <h2 className={`${h2} max-w-[22ch]`}>{RAMP.title}</h2>
        <p className="mt-6 flex max-w-[64ch] flex-wrap items-center gap-3 text-[17px] leading-7 text-fg-muted"><span className="chip-plain" data-variant="dashed">{RAMP.chip}</span>{RAMP.truth}</p>
        <ol className="mt-12 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1.15fr_auto_1fr] lg:items-stretch">
          {RAMP.nodes.map((n, k) => (
            <li key={n.title} className="contents">
              {k > 0 && <span aria-hidden className="flex items-center justify-center py-1 text-[18px] text-fg-muted lg:px-1 lg:py-0"><span className="lg:hidden">{'↓'}</span><span className="hidden lg:inline">{'→'}</span></span>}
              <div className={`rounded-xl p-5 ${n.ours ? 'bg-black text-white' : 'bg-surface-raised'}`}>
                <p className="text-[17px] font-[500] leading-6">{n.title}</p>
                <p className={`mt-2 break-words font-mono text-[13px] leading-5 ${n.ours ? 'text-white/70' : 'text-fg-muted'}`}>{n.api}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[70ch] text-[15px] leading-6 text-fg-muted">{RAMP.note}</p>
        <p className="mt-2 text-[14px] text-fg-muted">{RAMP.trademark}</p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="overflow-hidden bg-surface-raised">
      <div className={`${wrap} pb-10 pt-20 lg:pt-28`}>
        <h2 className="display text-[clamp(2.75rem,6vw,5rem)] leading-[1.04]">{CTA.title}</h2>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={RECORDED_RUN_HREF} className={primary}>{CTA.primary}<span aria-hidden>{'→'}</span></a>
          <a href={REPO_URL} className={secondary} rel="noreferrer">{CTA.code}</a>
        </div>
        <div className="mt-20 flex flex-col gap-3 border-t border-rule-strong pt-6 text-[14px] text-fg-muted md:flex-row md:items-center md:gap-6">
          <span>{CTA.team}</span>
          <a href={REPO_URL} className="hover:text-fg" rel="noreferrer">github.com/danielryang/countercall</a>
          <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-fg" rel="noreferrer">{CTA.license}</a>
        </div>
        <p className="mt-3 text-[14px] text-fg-muted">{CTA.fine}</p>
      </div>
      {/* the closing gesture: a giant wordmark, cropped by the page edge */}
      <div aria-hidden className="h-[9.5vw] select-none overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="display whitespace-nowrap text-center text-[14.5vw] leading-[0.8] text-fg/[0.07]">CounterCall</div>
      </div>
    </footer>
  );
}
