'use client';
// The app frame, laid out like Ramp's product: a light left sidebar (company, sections, the held-money total) and the page beside it, with a quiet
// footer for connection state and replay controls. Present mode (P, Esc, ?present=1) hides the footer, collapses the sidebar to icons and scales
// the frame (components/ui/PresentMode.tsx + globals.css). `?replay=<run>` swaps the live API for a recorded run (keyless, labelled REPLAY).
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { EventsProvider, useStream } from '@/components/EventsProvider';
import { HeldTicker } from '@/components/ui/HeldTicker';
import { Mark } from '@/components/ui/Mark';
import { AuditBadge } from '@/components/ui/AuditBadge';
import { PresentMode } from '@/components/ui/PresentMode';
import { badgeState } from '@/lib/audit-view';
import { heldCents, queue } from '@/lib/selectors';
import { useAudit } from '@/lib/use-audit';

const STATUS_TEXT = { connecting: 'Connecting', live: 'Live', reconnecting: 'Reconnecting', paused: 'Paused · click to resume', replay: 'Replay' } as const;
const SPEEDS = [1, 2, 4, 0.5];

/** 20px line icons, 1.6 stroke, one family. */
const ICON = {
  cases: <path d="M3 13h4l1.5 2.5h3L13 13h4M3 13l2.2-7.4A1.5 1.5 0 0 1 6.6 4.5h6.8a1.5 1.5 0 0 1 1.4 1.1L17 13v3a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16z" />,
  vendors: <path d="M3.5 17.5V7.8L10 3.5l6.5 4.3v9.7M3.5 17.5h13M7.5 17.5v-5h5v5M7 9.5h.01M10 9.5h.01M13 9.5h.01" />,
  audit: <path d="M7 5h9M7 10h9M7 15h9M3.5 5l.8.8L5.8 4.3M3.5 10l.8.8 1.5-1.5M3.5 15l.8.8 1.5-1.5" />,
} as const;
const NAV = [['/cases', 'Cases', 'cases'], ['/vendors', 'Vendors', 'vendors'], ['/audit', 'Audit log', 'audit']] as const;


function Sidebar() {
  const path = usePathname(); const qs = useSearchParams().toString();
  const { state } = useStream();
  const held = heldCents(state);
  const needs = queue(state)['NEEDS ACTION'].length;
  return (
    <aside data-sidebar className="flex w-[232px] shrink-0 flex-col bg-surface-raised px-3 pb-4 pt-4">
      <Link href="/" className="flex items-center gap-2 px-2 py-1" aria-label="CounterCall home">
        <Mark />
        <span data-nav-label className="text-[16px] font-[600] tracking-[-0.01em]">CounterCall</span>
      </Link>
      {/* company switcher, as Ramp's: a white bordered row */}
      <div data-nav-label className="mt-4 flex items-center justify-between rounded-sm border border-rule-strong bg-surface px-3 py-2 text-[14px]">
        <span className="truncate">Rice Robotics</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-fg-muted"><path d="M4 6l4 4 4-4" /></svg>
      </div>
      <nav aria-label="Sections" className="mt-5 space-y-px">
        {NAV.map(([h, l, k]) => {
          const on = path.startsWith(h);
          // keep ?replay= and ?at= so a replay stays a replay; the Cases link opens the list, like Ramp's nav
          const q = new URLSearchParams(qs); if (k === 'cases') q.set('view', 'list'); else q.delete('view');
          const href = q.toString() ? `${h}?${q.toString()}` : h;
          return (
            <Link key={h} href={href} aria-current={on ? 'page' : undefined} title={l}
              className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[15px] ${on ? 'bg-surface-sunk text-fg' : 'text-fg-muted hover:bg-surface-sunk/60 hover:text-fg'}`}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">{ICON[k]}</svg>
              <span data-nav-label className="flex-1">{l}</span>
              {k === 'cases' && needs > 0 && <span data-nav-label className="rounded-full bg-solar px-2 text-[12.5px] font-[500] leading-5 text-ink">{needs}</span>}
            </Link>
          );
        })}
      </nav>
      <div data-nav-label className="mt-auto border-t border-rule-strong px-2.5 pt-4">
        <div className="text-[14px] text-fg-muted">On hold now</div>
        <div className="mt-0.5 font-mono text-[22px] font-[450] text-blaze-ink"><HeldTicker cents={held} size={22} plain /></div>
        <div className="mt-1 text-[13px] text-fg-muted">Released only by a person</div>
      </div>
    </aside>
  );
}

function AuditFoot() {   // the log check, quietly, next to the connection state; links to /audit and keeps the query like the nav
  const { state, status } = useStream(); const qs = useSearchParams().toString(); const replay = status === 'replay';
  const a = useAudit({ lastSeq: state.lastSeq, replay });
  if (replay || a.status === 'loading') return null;
  const kind = badgeState(a.report);
  return <Link href={qs ? `/audit?${qs}` : '/audit'} className="hover:text-fg"><AuditBadge kind={kind} compact /></Link>;
}

function Foot() {
  const { status, replay, resume } = useStream();
  const live = status === 'live';
  const link = 'rounded px-1 hover:bg-surface-raised hover:text-fg';
  return (
    <footer data-present-hide className="relative flex h-10 shrink-0 items-center gap-5 border-t border-rule px-5 text-[13px] text-fg-muted">
      {replay && <i aria-hidden className="absolute -top-px left-0 h-0.5 bg-black transition-[width] duration-[var(--d-base)]" style={{ width: `${(replay.position / Math.max(1, replay.total)) * 100}%` }} />}
      <button type="button" onClick={resume} className="flex items-center gap-2" aria-live="polite">
        <i aria-hidden className={`h-2 w-2 rounded-full ${live ? 'bg-verified' : status === 'replay' ? 'bg-black' : 'bg-signal'}`} />
        {STATUS_TEXT[status]}{replay ? ' of a recorded run' : ''}
      </button>
      <AuditFoot />
      {replay && (
        <div className="flex items-center gap-2" aria-label="Replay controls">
          <button type="button" className={link} onClick={replay.playing ? replay.pause : replay.play}>{replay.playing ? 'Pause' : 'Play'}</button>
          <button type="button" className={link} onClick={replay.step}>Step</button>
          <button type="button" className={link} onClick={replay.restart}>Restart</button>
          <button type="button" className={link} onClick={() => replay.setSpeed(SPEEDS[(SPEEDS.indexOf(replay.speed) + 1) % SPEEDS.length])} aria-label="Playback speed">{replay.speed}{'×'}</button>
        </div>
      )}
      <span className="ml-auto">Press <kbd className="rounded border border-rule-strong px-1.5 font-sans text-[12px]">P</kbd> to present</span>
    </footer>
  );
}

function Providers({ children }: { children: ReactNode }) {
  const sp = useSearchParams(); const replay = sp.get('replay'); const atRaw = sp.get('at');
  return (
    <EventsProvider replay={replay} at={atRaw ? Number(atRaw) : null}>
      <div data-app className="flex h-screen min-h-[720px] bg-surface text-fg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col"><div className="min-h-0 flex-1">{children}</div><Foot /></div>
      </div>
      <PresentMode theme="ramp" />
    </EventsProvider>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  return <Suspense><Providers>{children}</Providers></Suspense>;
}
