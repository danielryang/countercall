'use client';
// "Three ways a call ends": transcripts taken from recorded runs in public/runs (app/page.tsx extracts them), with the policy result beside each.
// On tab change the lines appear one by one (the state change: the call is happening); the result rows follow; reduced motion shows everything at once.
// The only dark surface on the page (.night), mirroring the app's call card.
import { useEffect, useRef, useState } from 'react';
import type { CaseState } from '@/lib/events';
import { Chip } from '@/components/ui/Chip';
import { CALL } from './copy';

export interface OutcomeTurn { role: 'agent' | 'user'; text: string }
export interface Outcome {
  key: string;
  tab: string;
  provenance: string;      // "Recorded real call" or "Scripted vendor, real pipeline": shown, never hidden
  state: CaseState;        // the case_state the run ended in (drives the chip)
  turns: OutcomeTurn[];
  reason: string;          // REASON_TEXT[reason].rule, the plain sentence the app prints
  money: string;
}

const beat = () => {   // read the beat gap from the motion tokens so the page and the app pace the same
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--beat-gap').trim();   // browsers may report "1200ms" or "1.2s"
  const v = parseFloat(raw) * (raw.endsWith('ms') ? 1 : raw.endsWith('s') ? 1000 : 1);
  return Number.isFinite(v) && v >= 100 ? v * 0.6 : 700;
};

export function CallOutcomes({ outcomes }: { outcomes: Outcome[] }) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0);
  const o = outcomes[i];
  const total = o.turns.length + 3;                      // turns, then three policy rows
  const [shown, setShown] = useState(total);             // server render: everything visible
  const [seen, setSeen] = useState(false);               // the first play waits until the widget is on screen
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSeen(true); return; }
    setShown(0);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.35 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(total); return; }
    setShown(1);
    const gap = beat(); let n = 1;
    const id = window.setInterval(() => { n += 1; setShown(n); if (n >= total) window.clearInterval(id); }, gap);
    return () => window.clearInterval(id);
  }, [seen, i, run, total]);

  const pick = (k: number) => { setI(k); setRun((r) => r + 1); };
  const done = shown >= total;

  return (
    <div ref={box} className="night overflow-hidden rounded-xl border border-rule bg-surface text-fg">
      <div role="tablist" aria-label="Call outcomes" className="flex overflow-x-auto border-b border-rule">
        {outcomes.map((x, k) => (
          <button key={x.key} role="tab" type="button" aria-selected={k === i} aria-controls="call-panel" onClick={() => pick(k)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-[14px] transition-colors duration-[var(--d-fast)] sm:px-5 ${k === i ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>
            {x.tab}
          </button>
        ))}
        <button type="button" onClick={() => setRun((r) => r + 1)} className="ml-auto hidden shrink-0 px-5 text-[13px] text-fg-muted hover:text-fg sm:block">{CALL.replay}</button>
      </div>
      <div id="call-panel" role="tabpanel" className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-[300px] px-4 py-4 sm:px-5" aria-live="polite">
          <div className="cap mb-3 flex items-center gap-2"><i aria-hidden className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-fg-muted' : 'animate-blink bg-fg'}`} />{o.provenance}</div>
          {o.turns.map((t, k) => (
            <div key={`${run}-${k}`} data-on={k < shown} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 py-1.5 text-[15px] leading-6 transition-[opacity,transform] duration-[var(--d-base)] ease-[var(--ease-out)] data-[on=false]:translate-y-2 data-[on=false]:opacity-0">
              <span className="cap pt-1">{t.role === 'agent' ? CALL.agent : CALL.vendor}</span>
              <span className={t.role === 'user' ? 'text-fg' : 'text-fg-muted'}>{t.text}</span>
            </div>
          ))}
        </div>
        <dl className="border-t border-rule bg-surface-raised px-4 py-4 text-[14px] sm:px-5 lg:border-l lg:border-t-0">
          <div className="cap mb-3">{CALL.policy}</div>
          {[
            [CALL.rows.outcome, <Chip key="c" state={o.state} />],
            [CALL.rows.reason, o.reason],
            [CALL.rows.money, o.money],
          ].map(([k, v], r) => (
            <div key={`${run}-${String(k)}`} data-on={o.turns.length + r < shown} className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 border-b border-rule py-2.5 transition-opacity duration-[var(--d-base)] last:border-b-0 data-[on=false]:opacity-0">
              <dt className="text-fg-muted">{k}</dt><dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
