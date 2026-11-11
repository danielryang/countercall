'use client';
// One case, told as a story: a plain headline, the email that triggered it, and the four steps CounterCall took.
// This file owns the local UI state the pure components share: which signal is lit up (email <-> reasons), the live case clock, and the timing disclosure.
import { CaseStory } from '@/components/case/CaseStory';
import { EmailPane } from '@/components/case/EmailPane';
import { StatusBanner } from '@/components/case/StatusBanner';
import { Waterfall } from '@/components/case/Waterfall';
import { Card } from '@/components/ui/Card';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStream } from '@/components/EventsProvider';
import { TIMING } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { clockRunning } from '@/lib/selectors';
import { waterfall } from '@/lib/waterfall';
import { ReleaseDialog } from './ReleaseDialog';

/** Wall clock, ticking once a second only while `on`. Replays never use it: their timestamps are not wall-clock time. */
function useNow(on: boolean): number | undefined {
  const [now, setNow] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!on) { setNow(undefined); return; }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

export function CaseDetail({ c }: { c: CaseView }) {
  const { replay, refresh } = useStream();
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState<string[] | null>(null);
  const [timing, setTiming] = useState(false);
  useEffect(() => { setHot(null); }, [c.id]);
  const now = useNow(!replay && clockRunning(c));
  const w = useMemo(() => waterfall(c), [c]);
  const finished = !clockRunning(c);
  /** opened on demand below the story: bring it into view (instant scroll; no smooth scrolling under reduced motion) */
  const reveal = useCallback((el: HTMLDivElement | null) => {   // stable, so it runs once when the panel opens, not on every event
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, []);
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <StatusBanner c={c} nowMs={now} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4">
        <Card title="The email"><EmailPane c={c} hot={hot} onHot={setHot} /></Card>
        {/* Flex column: the story may shrink an open call step (its transcript scrolls inside) so Result and the timing toggle stay on the stage; the column
            itself scrolls only as a fallback on very short windows. */}
        <div className="flex min-h-0 flex-col overflow-y-auto pr-1">
          <h2 className="shrink-0 px-2 pb-1 pt-1 text-[14px] font-medium">What CounterCall did</h2>
          <CaseStory key={c.id} c={c} hot={hot} onHot={setHot} onRelease={replay ? undefined : () => setOpen(true)} releaseBlocked="A replay is read-only. Open the live view to approve." />
          {w && finished && c.state !== 'scanning' && c.state !== 'cleared' && (   // timing is a footnote: offered only once the case is decided
            <div className="ml-10 mt-1 shrink-0">
              <button type="button" aria-expanded={timing} onClick={() => setTiming(!timing)} className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-fg-muted hover:bg-surface-raised hover:text-fg">
                <span>{TIMING.title}</span>
                <span aria-hidden className="ml-auto">{timing ? '▾' : '▸'}</span>
              </button>
              {timing && <div ref={reveal} className="px-2 pb-3 pt-1"><Waterfall w={w} paced={replay?.source === 'generated'} finished={finished} /></div>}
            </div>
          )}
        </div>
      </div>
      <ReleaseDialog c={c} open={open} onOpenChange={setOpen} onDone={refresh} />
    </div>
  );
}
