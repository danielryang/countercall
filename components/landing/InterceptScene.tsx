'use client';
// The hero scene: CounterCall's own case page, drawn as a small Ramp-style app mock, telling one case once per 13.4 s loop:
// the email is flagged (the lime highlighter sweeps the suspicious words) -> the payments freeze ($24,800.00 settles in Blaze) -> the vendor is phoned
// on the number already on file (the email's own contact route struck out, the transcript types in) -> the result lands (Blocked).
// React only advances a clock; every region keeps its size (no layout shift) and CSS transitions reveal each change. Paused offscreen and in hidden
// tabs. Reduced motion: the final frame, still. Labelled as an illustration built from a recorded run, never as live.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Mark } from '@/components/ui/Mark';
import { SCENE } from './copy';

const T = { flag: 1200, hold: 3600, call: 5600, result: 10200 } as const;   // beat start times (ms)
const LOOP = 13400;
const CPS_MS = 28;                                                          // type-in speed per character
const AGENT_AT = T.call + 500;
const VENDOR_AT = AGENT_AT + SCENE.agent.length * CPS_MS + 600;
const FINAL = LOOP - 1;

type Stage = 0 | 1 | 2 | 3 | 4;
type St = 'done' | 'active' | 'pending';
const stageAt = (t: number): Stage => (t >= T.result ? 4 : t >= T.call ? 3 : t >= T.hold ? 2 : t >= T.flag ? 1 : 0);
const typed = (text: string, from: number, t: number) => text.slice(0, Math.max(0, Math.floor((t - from) / CPS_MS)));
const clock = (t: number) => `00:${String(Math.floor(t / 1000)).padStart(2, '0')}`;
/** Which step is open at each beat, each step's status, and its status word (the app's words). The hold is not a step: it shows in step 1's word
 *  and in the case details, as in the app. */
const openTab = (s: Stage) => (s <= 2 ? 0 : s - 2);
const stepSt = (i: number, s: Stage): St =>
  i === 0 ? (s === 0 ? 'active' : 'done') : i === 1 ? (s === 3 ? 'active' : s === 4 ? 'done' : 'pending') : s === 4 ? 'done' : 'pending';
const stepWord = (i: number, s: Stage) => [
  s === 0 ? 'Reading' : s === 1 ? 'Flagged, holding payments' : 'Flagged, payments held',
  s === 3 ? 'On the phone' : s === 4 ? 'Answered' : 'Waiting',
  s === 4 ? 'Blocked' : 'Waiting',
][i];
/** When each step happened, and the first beat it shows; the step the case is at, per beat (for the checkpoint ticks). */
const STEP_TIME = [{ at: T.flag, from: 1 }, { at: T.call, from: 3 }, { at: T.result, from: 4 }] as const;
const RAIL_AT = [0, 1, 1, 1, 2] as const;
/** Where the case is on the timeline rail (percent): creeping through the step in progress (fast, then slower), waiting at the next step's start
 *  between steps, all black once the result lands. The same rule as the app's rail (components/case/CaseStory.tsx). */
const railPos = (t: number, s: Stage) => {
  const through = (from: number, to: number) => { const f = Math.min(1, Math.max(0, (t - from) / (to - from))); return 0.06 + 0.84 * (1 - (1 - f) ** 2); };
  if (s === 4) return 100;
  if (s === 0) return (through(0, T.flag) / 3) * 100;
  if (s === 3) {   // the call moves with the lines spoken, as in the app: a notch while the agent asks, another while the vendor answers
    const typedFrac = (from: number, len: number) => Math.min(1, Math.max(0, (t - from) / (len * CPS_MS)));
    return ((1 + 0.1 + 0.4 * typedFrac(AGENT_AT, SCENE.agent.length) + 0.4 * typedFrac(VENDOR_AT, SCENE.vendor.length)) / 3) * 100;
  }
  return (1 / 3) * 100;
};

const TONE = {
  progress: 'border-rule-strong bg-surface-raised text-fg',
  warn: 'border-banner-rule bg-banner text-banner-ink',
  danger: 'border-blocked-rule bg-blocked-soft text-blocked',
} as const;

/** A phrase the rules flagged. The lime marker sweeps across it (in reading order, `i`) the moment the email is flagged; `.ev` lives in globals.css. */
function Hl({ on, i, children }: { on: boolean; i: number; children: ReactNode }) {
  return <span className={on ? 'ev' : ''} style={on ? { ['--sweep-delay' as string]: `${i * 220}ms` } : undefined}>{children}</span>;
}

/** One panel of the open step. All panels share one box, so changing steps never moves anything around it. */
function Panel({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div data-on={on} aria-hidden={!on}
      className="absolute inset-0 transition-[opacity,transform] duration-[var(--d-base)] ease-[var(--ease-out)] data-[on=false]:pointer-events-none data-[on=false]:translate-y-1 data-[on=false]:opacity-0">
      {children}
    </div>
  );
}

const ICONS = [
  <path key="c" d="M3 13h4l1.5 2.5h3L13 13h4M3 13l2.2-7.4A1.5 1.5 0 0 1 6.6 4.5h6.8a1.5 1.5 0 0 1 1.4 1.1L17 13v3a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16z" />,
  <path key="v" d="M3.5 17.5V7.8L10 3.5l6.5 4.3v9.7M3.5 17.5h13M7.5 17.5v-5h5v5" />,
  <path key="a" d="M7 5h9M7 10h9M7 15h9M3.5 5l.8.8L5.8 4.3M3.5 10l.8.8 1.5-1.5M3.5 15l.8.8 1.5-1.5" />,
];

export function InterceptScene() {
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStill(true); setT(FINAL); return; }
    let visible = true; let last = performance.now(); let acc = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 });
    if (ref.current) io.observe(ref.current);
    const id = window.setInterval(() => {
      const now = performance.now(); const dt = now - last; last = now;
      if (!visible || document.visibilityState === 'hidden') return;   // pause: resume where we left off
      acc = (acc + dt) % LOOP; setT(acc);
    }, 50);
    return () => { window.clearInterval(id); io.disconnect(); };
  }, []);

  const s = stageAt(t);
  const tab = openTab(s);
  const agent = still ? SCENE.agent : typed(SCENE.agent, AGENT_AT, t);
  const vendor = still ? SCENE.vendor : typed(SCENE.vendor, VENDOR_AT, t);
  const callSec = s >= 3 ? Math.max(0, Math.floor((Math.min(t, T.result) - T.call) / 1000)) : 0;
  const [local, domain] = SCENE.email.address.split('@');

  return (
    <figure ref={ref} aria-label={SCENE.aria} className="min-w-0 rounded-xl bg-surface-raised p-3">
      <figcaption className="flex items-center gap-2 px-1 pb-2.5 text-[13px] text-fg-muted">
        <i aria-hidden className="h-2 w-2 rounded-full bg-fg-muted" />
        <span className="min-w-0 truncate">{SCENE.label}</span>
        <span className="ml-auto font-mono">{clock(t)}</span>
      </figcaption>

      <div aria-hidden className="grid h-[456px] grid-cols-[44px_minmax(0,1fr)] overflow-hidden rounded-lg border border-rule bg-surface">
        {/* the app's sidebar, collapsed to icons */}
        <div className="flex flex-col items-center gap-2 border-r border-rule bg-surface-raised py-3">
          <Mark size={20} />
          {ICONS.map((icon, i) => (
            <span key={i} className={`relative mt-1 flex h-8 w-8 items-center justify-center rounded-sm ${i === 0 ? 'bg-surface-sunk text-fg' : 'text-fg-muted'}`}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              {i === 0 && <i className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-solar" />}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-col px-5 pt-3">
          <span className="text-[11.5px] text-fg-muted">{'←'} Cases</span>
          <div className="mt-1 flex items-center gap-2.5">
            <Avatar name="Acme Corp" size={26} />
            <span className="display text-[24px] leading-8">Acme Corp</span>
          </div>

          {/* the banner says what happened, once; it changes tone and words at each beat (state change: case.state moved) */}
          <div className="relative mt-3 h-[58px] shrink-0">
            {SCENE.banner.map((b, i) => (
              <div key={b.title} data-on={i === s}
                className={`absolute inset-0 rounded-sm border px-3.5 py-2 transition-opacity duration-[var(--d-base)] ease-[var(--ease-out)] data-[on=false]:opacity-0 ${TONE[b.tone]}`}>
                <p className="truncate text-[13.5px] font-[550] leading-5">{b.title}</p>
                <p className="truncate text-[12px] leading-[18px] text-fg">{b.sub}</p>
              </div>
            ))}
          </div>

          {/* the four steps as a timeline: one continuous rail, black up to where the case is, grey after, the same black tick marking the spot.
              It creeps through the step in progress and glides when the case moves on (state change: the case advanced). */}
          <div className="mt-3 shrink-0">
            <div className="grid grid-cols-3">
              {SCENE.tabs.map((name, i) => (
                <span key={name} className={`-ml-1.5 mr-2 block rounded-sm px-1.5 py-0.5 transition-colors duration-[var(--d-base)] ${i === tab ? 'bg-surface-raised' : ''}`}>
                  <span className={`block truncate text-[12.5px] leading-4 ${stepSt(i, s) === 'pending' ? 'text-fg-muted' : 'font-[550] text-fg'}`}>{name}</span>
                  <span className="block truncate text-[11px] leading-4 text-fg-muted">{stepWord(i, s)}</span>
                </span>
              ))}
            </div>
            <div className="relative mt-2 h-[2px] rounded-full bg-rule-strong">
              {SCENE.tabs.map((name, i) => <i key={name} className={`absolute -top-[4px] h-[10px] w-[2px] ${s === 4 || i <= RAIL_AT[s] ? 'bg-fg' : 'bg-rule-strong'}`} style={{ left: `${(i * 100) / 3}%` }} />)}
              <span className={`absolute inset-y-0 left-0 ${s === 0 ? '' : 'transition-[width] duration-[var(--d-slow)] ease-[var(--ease-out)]'}`} style={{ width: `${railPos(t, s)}%` }}>
                <i className="absolute inset-0 rounded-full bg-fg" />
                {s !== 4 && <i className="absolute -right-px -top-[4px] h-[10px] w-[2px] bg-fg" />}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 font-mono text-[11px] text-fg-muted">
              {SCENE.tabs.map((name, i) => <span key={name}>{s >= STEP_TIME[i].from ? clock(STEP_TIME[i].at) : stepSt(i, s) === 'active' ? 'now' : '\u00a0'}</span>)}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_150px] gap-5 pt-3.5">
            <div className="relative">
              <Panel on={tab === 0}>
                <div className="rounded-sm border border-rule text-[12.5px] leading-[19px]">
                  <div className="border-b border-rule px-3 py-2">
                    <div className="truncate"><span className="text-fg-muted">From </span>{SCENE.email.from} <span className="text-fg-muted">{'<'}</span>{local}@<Hl on={s >= 1} i={0}>{domain}</Hl><span className="text-fg-muted">{'>'}</span></div>
                    <div className="truncate"><span className="text-fg-muted">Subject </span>{SCENE.email.subject}</div>
                  </div>
                  <div className="space-y-2 px-3 py-2.5">
                    <p>{SCENE.body.greeting}</p>
                    <p><Hl on={s >= 1} i={1}>{SCENE.body.changed}</Hl> {SCENE.body.ask} <Hl on={s >= 1} i={2}>{SCENE.body.newAccount}</Hl>:</p>
                    <p>{SCENE.body.bankLabel} <Hl on={s >= 1} i={3}>{SCENE.body.bank}</Hl></p>
                  </div>
                </div>
              </Panel>

              <Panel on={tab === 1}>
                <div className="text-[12.5px]">
                  <div className="flex items-baseline gap-2 text-fg-muted">
                    {/* the strike draws left to right: the email's own contact route is refused */}
                    <span className="relative">{SCENE.dial.never}
                      <i data-on={s >= 3} className="absolute left-0 right-0 top-1/2 h-px origin-left bg-fg-muted transition-transform delay-[var(--d-base)] duration-[var(--d-base)] ease-[var(--ease-out)] data-[on=false]:scale-x-0" />
                    </span>
                    <span>{SCENE.dial.neverNote}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-fg-muted">Number on file</span>
                    <span className="font-mono text-[16px]">{SCENE.dial.onFile}</span>
                    <span className="text-[11.5px] text-fg-muted">{SCENE.dial.onFileNote}</span>
                  </div>
                  <div className="mt-2.5 rounded-sm border border-rule">
                    <div className="flex items-center gap-2 border-b border-rule px-3 py-1.5 text-[11.5px] text-fg-muted">
                      <i className={`h-1.5 w-1.5 rounded-full ${s === 3 ? 'animate-blink bg-fg' : 'bg-fg-muted'}`} />
                      {s === 3 ? 'On the call' : 'Call ended'} {'·'} <span className="font-mono">{clock(callSec * 1000)}</span>
                    </div>
                    <div className="grid min-h-[76px] grid-cols-[78px_minmax(0,1fr)] gap-x-2 gap-y-1.5 px-3 py-2 text-[12.5px] leading-[18px]">
                      <span className="font-[550] text-fg-muted">CounterCall</span>
                      <span className={`text-fg-muted ${!still && s === 3 && agent.length < SCENE.agent.length ? 'caret' : ''}`}>{agent}</span>
                      <span className="font-[550]">Acme</span>
                      <span className={!still && s === 3 && vendor.length > 0 && vendor.length < SCENE.vendor.length ? 'caret' : ''}>{vendor}</span>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel on={tab === 2}>
                <div>
                  <p className="text-[12px] text-fg-muted">{SCENE.vendorSaid}</p>
                  {/* the vendor's answer gets the red marker the moment the result lands */}
                  <p className="mt-1 text-[19px] leading-7 tracking-[-0.01em]"><span className={s === 4 ? 'ev' : ''} data-verdict="no">{'“'}{SCENE.vendor}{'”'}</span></p>
                  <p className="mt-3 text-[12.5px] leading-[19px]">{SCENE.result}</p>
                </div>
              </Panel>
            </div>

            {/* the case details column: the held amount settles in when the hold lands (state change: payments frozen) */}
            <div className="min-w-0 text-[12px]">
              <p className="text-[14px] font-[500]">Case details</p>
              <div className="mt-2 border-b border-rule pb-2.5">
                <div className="text-fg-muted">On hold</div>
                <div className="relative h-8">
                  <span data-on={s < 2} className="absolute inset-x-0 top-0.5 font-mono text-[21px] text-fg-muted transition-opacity duration-[var(--d-base)] data-[on=false]:opacity-0">$0.00</span>
                  <span data-on={s >= 2} className="absolute inset-x-0 top-0.5 font-mono text-[21px] text-blaze-ink transition-[opacity,transform] duration-[var(--d-slow)] ease-[var(--ease-out)] data-[on=false]:-translate-y-1.5 data-[on=false]:opacity-0">{SCENE.held.amount}</span>
                </div>
                <div className="text-fg-muted">{s >= 2 ? `Held since ${clock(T.hold)}` : '\u00a0'}</div>
                {/* the invoices the hold covers; the hatch lands with the hold (state change: payments frozen) */}
                <ul className="mt-2 space-y-1">
                  {SCENE.invoices.map((b) => (
                    <li key={b.n} className="flex items-center gap-1.5">
                      <i className={`block h-3 w-3 shrink-0 rounded-sm border transition-colors duration-[var(--d-base)] ${s >= 2 ? 'frozen border-signal' : 'border-rule-strong'}`} />
                      <span className="flex-1">{b.n}</span><span className="font-mono">{b.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <dl className="mt-2.5 space-y-2">
                <div><dt className="text-fg-muted">Payments</dt><dd>Ramp mock</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
