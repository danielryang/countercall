'use client';
// The hero scene: the product's own story in one card, looping every 13.4 s (04 §5.1). Email -> hold -> the number on file (not the email) -> call -> blocked.
// React only advances a clock; rows are always in the layout (no shift) and CSS transitions reveal them. Paused offscreen and in hidden tabs.
// Reduced motion: the final frame, still. Labelled as an illustration built from a recorded run, never as live.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Chip } from '@/components/ui/Chip';
import { STAMP } from '@/lib/copy';
import { SCENE } from './copy';

const START = [0, 1600, 3600, 5600, 9600] as const;   // stage start times (ms), from the tested HTML prototype
const LOOP = 13400;
const CPS_MS = 25;                                     // type-in speed per character
const AGENT_AT = START[3] + 300;
const VENDOR_AT = AGENT_AT + SCENE.agent.length * CPS_MS + 700;
const FINAL = LOOP - 1;

const typed = (text: string, from: number, t: number) => text.slice(0, Math.max(0, Math.floor((t - from) / CPS_MS)));
const clock = (t: number) => `00:${String(Math.floor(t / 1000)).padStart(2, '0')}`;

/** One revealed row. `on` flips opacity and an 8px rise (the state change: this step has happened). */
function Row({ on, step, children, last = false }: { on: boolean; step: string; children: ReactNode; last?: boolean }) {
  return (
    <div data-on={on} className={`grid grid-cols-[64px_minmax(0,1fr)] gap-3 px-4 py-3 transition-[opacity,transform] duration-[var(--d-slow)] ease-[var(--ease-out)] data-[on=false]:translate-y-2 data-[on=false]:opacity-0 sm:grid-cols-[76px_minmax(0,1fr)] sm:px-5 ${last ? '' : 'border-b border-rule'}`}>
      <span className="cap pt-0.5">{step}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

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

  const stage = START.reduce<number>((a, s, i) => (t >= s ? i : a), 0);
  const s = STAMP.DENIED_FRAUD;
  const agent = still ? SCENE.agent : typed(SCENE.agent, AGENT_AT, t);
  const vendor = still ? SCENE.vendor : typed(SCENE.vendor, VENDOR_AT, t);

  return (
    <figure ref={ref} aria-label={SCENE.aria} className="relative min-w-0 overflow-hidden rounded-xl border border-rule bg-surface-raised">
      <figcaption className="flex items-center gap-2 border-b border-rule px-4 py-2.5 text-[12px] text-fg-muted sm:px-5">
        <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg-muted" />
        <span className="min-w-0 truncate">{SCENE.label}</span>
        <span className="ml-auto font-mono tabular-nums">{clock(t)}</span>
      </figcaption>
      <div aria-hidden>
        <Row on={stage >= 0} step={SCENE.steps[0]}>
          <div className="flex flex-wrap items-baseline gap-x-2 text-[14px]"><b className="font-medium">{SCENE.email.from}</b><span className="truncate text-fg-muted">{SCENE.email.address}</span></div>
          <div className="text-[14px]">{SCENE.email.subject}</div>
          <p className="mt-1 text-[13px] leading-5 text-fg-muted"><span className="ev">{SCENE.email.quote}</span></p>
        </Row>
        <Row on={stage >= 1} step={SCENE.steps[1]}>
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-[14px]">{SCENE.held.vendor}</span>
            <Chip state="held" />
          </div>
          {/* the freeze: hatching lands over the amount the moment the hold is applied */}
          <div className="mt-1.5 flex items-center gap-3">
            <span data-on={stage >= 1} className="rounded-sm px-1.5 font-mono text-[20px] font-medium tabular-nums transition-[background-size] duration-[var(--d-slow)] ease-[var(--ease-out)] frozen bg-no-repeat data-[on=false]:bg-[length:0%_100%] data-[on=true]:bg-[length:100%_100%]">{SCENE.held.amount}</span>
            <span className="cap hidden sm:inline">{SCENE.held.note}</span>
          </div>
        </Row>
        <Row on={stage >= 2} step={SCENE.steps[2]}>
          <div className="flex items-baseline gap-2 text-[13px] text-fg-muted">
            {/* the strike draws left to right: the email's own contact route is refused */}
            <span className="relative">
              {SCENE.dial.never}
              <i data-on={stage >= 2} className="absolute left-0 right-0 top-1/2 h-px origin-left bg-fg-muted transition-transform delay-[var(--d-base)] duration-[var(--d-base)] ease-[var(--ease-out)] data-[on=false]:scale-x-0" />
            </span>
            <span>{SCENE.dial.neverNote}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-[16px] font-medium tabular-nums">{SCENE.dial.onFile}</span>
            <span className="cap">{SCENE.dial.onFileNote}</span>
          </div>
        </Row>
        <Row on={stage >= 3} step={SCENE.steps[3]}>
          <div className="mb-1.5">{stage >= 4 ? <span className="chip-plain" data-variant="quiet">Call ended</span> : <Chip state="calling" />}</div>
          <div className="grid min-h-[44px] grid-cols-[84px_minmax(0,1fr)] gap-x-2 text-[13px] leading-5">
            <span className="cap pt-0.5">CounterCall</span><span className={`text-fg-muted ${!still && stage === 3 && agent.length < SCENE.agent.length ? 'caret' : ''}`}>{agent}</span>
            <span className="cap pt-0.5">Acme</span><span className={!still && stage === 3 && vendor.length > 0 && vendor.length < SCENE.vendor.length ? 'caret' : ''}>{vendor}</span>
          </div>
        </Row>
        <Row on={stage >= 4} step={SCENE.steps[4]} last>
          <div className="flex min-h-[52px] flex-wrap items-center gap-x-4 gap-y-2">
            <span className="min-w-[10rem] flex-1 text-[13px] leading-5 text-fg-muted">{SCENE.result}</span>
            {stage >= 4 && (
              // the stamp: lands once per loop, only when the result exists (keyframe `stamp` in globals.css)
              <span className="stamp shrink-0 border-2 px-3 py-1.5 text-center" style={{ borderColor: 'var(--color-blocked)', color: 'color-mix(in oklab, var(--color-blocked) var(--chip-mix), var(--fg))' }}>
                <span className="block font-mono text-[17px] font-semibold uppercase leading-5 tracking-wider">{s.word}</span>
                <span className="block text-[11px] font-medium leading-4">{s.sub}</span>
              </span>
            )}
          </div>
        </Row>
      </div>
    </figure>
  );
}
