'use client';
// The app frame: top bar + one shared event stream. `?replay=<run>` swaps the live API for a recorded run (keyless, offline-safe, tagged REPLAY).
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { EventsProvider, useStream } from '@/components/EventsProvider';
import { fmtCents, heldCents } from '@/lib/selectors';

const STATUS_TEXT = { connecting: 'CONNECTING', live: 'LIVE', reconnecting: 'RECONNECTING', paused: 'PAUSED · CLICK TO RESUME', replay: 'REPLAY' } as const;

function Bar() {
  const { state, status, replay, resume } = useStream();
  const live = status === 'live';
  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b border-rule px-4">
      <Link href="/" className="flex items-center gap-2" aria-label="CounterCall home">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M6 0l6 6-6 6-6-6z" fill="currentColor" /></svg>
        <span className="display text-[15px] uppercase">CounterCall</span>
      </Link>
      <span className="label hidden text-fg-muted md:inline">Rice Robotics</span>
      <nav className="label flex gap-5">
        <span className="border-b border-fg pb-0.5">Cases</span>
        <span className="text-fg-muted/60" title="Not built yet">Vendors</span>
        <span className="text-fg-muted/60" title="Not built yet">Audit</span>
      </nav>
      <div className="ml-auto flex items-center gap-6">
        {replay && (
          <div className="label flex items-center gap-2 text-fg-muted" aria-label="Replay controls">
            <span className="text-fg">{replay.name}</span><span className="tabular-nums">{replay.position}/{replay.total}</span>
            <button type="button" className="border border-rule px-1.5 hover:bg-surface-raised" onClick={replay.playing ? replay.pause : replay.play}>{replay.playing ? 'Pause' : 'Play'}</button>
            <button type="button" className="border border-rule px-1.5 hover:bg-surface-raised" onClick={replay.step}>Step</button>
            <button type="button" className="border border-rule px-1.5 hover:bg-surface-raised" onClick={replay.restart}>Restart</button>
            <button type="button" className="border border-rule px-1.5 hover:bg-surface-raised" onClick={() => replay.setSpeed(replay.speed === 1 ? 4 : 1)}>{replay.speed}x</button>
          </div>
        )}
        <button type="button" onClick={resume} className="label flex items-center gap-2" aria-live="polite">
          <i aria-hidden className={`h-2 w-2 ${live ? 'bg-verified' : status === 'replay' ? 'bg-signal' : 'bg-held'} ${live ? 'animate-ping-dot' : ''}`} />
          {STATUS_TEXT[status]}
        </button>
        <span className="label flex items-baseline gap-2"><span className="text-fg-muted">Held</span><span className="font-mono text-[15px] font-semibold tabular-nums">{fmtCents(heldCents(state))}</span></span>
      </div>
    </header>
  );
}

function Providers({ children }: { children: ReactNode }) {
  const sp = useSearchParams(); const replay = sp.get('replay'); const atRaw = sp.get('at');
  return <EventsProvider replay={replay} at={atRaw ? Number(atRaw) : null}><div data-app className="flex h-screen min-h-[720px] flex-col bg-surface text-fg"><Bar /><div className="min-h-0 flex-1">{children}</div></div></EventsProvider>;
}
export function AppShell({ children }: { children: ReactNode }) {
  return <Suspense><Providers>{children}</Providers></Suspense>;
}
