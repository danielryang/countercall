'use client';
// One case, as a Ramp detail page: a breadcrumb back to the list, the vendor as the title with its initials avatar, the actions on the right (one lime
// primary), the banner that says what happened, then the four steps as tabs with the case details beside them.
// This file owns the local UI state the pure components share: which signal is lit up (email <-> reasons), the live case clock, and the timing disclosure.
import { CaseDetails } from '@/components/case/CaseDetails';
import { CaseStory } from '@/components/case/CaseStory';
import { EmailPane } from '@/components/case/EmailPane';
import { StatusBanner } from '@/components/case/StatusBanner';
import { Waterfall } from '@/components/case/Waterfall';
import { Avatar } from '@/components/ui/Avatar';
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

const READ_ONLY = 'A replay is read-only. Open the live view to approve.';

export function CaseDetail({ c, onBack }: { c: CaseView; onBack?: () => void }) {
  const { replay, refresh } = useStream();
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState<string[] | null>(null);
  const [timing, setTiming] = useState(false);
  useEffect(() => { setHot(null); }, [c.id]);
  const now = useNow(!replay && clockRunning(c));
  const w = useMemo(() => waterfall(c), [c]);
  const finished = !clockRunning(c);
  const lap = (k: string) => w?.laps.find((l) => l.key === k);
  // when each step happened: flagged, held, call placed, result (ms after the email arrived)
  const times = { email: lap('detect')?.endMs ?? null, hold: lap('hold')?.endMs ?? null, call: lap('dial')?.endMs ?? lap('call')?.startMs ?? null, result: w && finished && c.state !== 'scanning' ? w.totalMs : null };
  const reveal = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, []);
  const canRelease = (c.state === 'awaiting_approval' || c.state === 'fraud_blocked' || c.state === 'needs_human') && !c.release;
  const name = c.vendorName ?? c.email?.from.address ?? 'Unknown sender';
  return (
    <div className="flex h-full min-h-0 flex-col px-10 pb-4 pt-6">
      {onBack && (
        <button type="button" data-back onClick={onBack} className="flex w-fit items-center gap-1.5 text-[15px] text-fg-muted hover:text-fg">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M13 8H3M7 4L3 8l4 4" /></svg>
          Cases
        </button>
      )}
      <div className="mt-2 flex shrink-0 items-center gap-4">
        <Avatar name={name} size={44} />
        <h1 className="display min-w-0 flex-1 truncate text-[40px] leading-[46px]">{name}</h1>
        {canRelease && (
          <button type="button" onClick={() => setOpen(true)} title={replay ? READ_ONLY : undefined} className="btn">Review and release{'…'}</button>
        )}
      </div>
      <div className="mt-5"><StatusBanner c={c} nowMs={now} /></div>
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <CaseStory key={c.id} c={c} hot={hot} onHot={setHot} times={times}
          email={<EmailPane c={c} hot={hot} onHot={setHot} />}
          details={<CaseDetails c={c} heldAtMs={times.hold} />}
          timing={w && finished && c.state !== 'scanning' && c.state !== 'cleared' ? (   // timing is a footnote: offered only once the case is decided
            <div className="border-t border-rule pt-2">
              <button type="button" aria-expanded={timing} onClick={() => setTiming(!timing)} className="flex w-full items-center gap-2 py-1.5 text-left text-[15px] text-fg-muted hover:text-fg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform duration-[var(--d-fast)] ${timing ? 'rotate-90' : ''}`}><path d="M6 3.5L10.5 8 6 12.5" /></svg>
                <span>{TIMING.title}</span>
              </button>
              {timing && <div ref={reveal} className="pb-3 pt-2"><Waterfall w={w} paced={replay?.source === 'generated'} finished={finished} /></div>}
            </div>
          ) : undefined} />
      </div>
      <ReleaseDialog c={c} open={open} onOpenChange={setOpen} onDone={refresh} readOnly={!!replay} />
    </div>
  );
}
