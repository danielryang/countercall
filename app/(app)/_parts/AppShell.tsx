'use client';
// The app frame. A slim top bar (brand, org, the frozen-money total), the screen, and a quiet footer for connection state, replay controls and key hints.
// `?replay=<run>` swaps the live API for a recorded run (keyless, offline-safe, labelled REPLAY).
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { EventsProvider, useStream } from '@/components/EventsProvider';
import { fmtCents, heldCents } from '@/lib/selectors';

const STATUS_TEXT = { connecting: 'Connecting', live: 'Live', reconnecting: 'Reconnecting', paused: 'Paused · click to resume', replay: 'Replay' } as const;
const btn = 'border border-rule px-2 py-0.5 text-fg-muted hover:bg-surface-raised hover:text-fg';

function Top() {
  const { state } = useStream();
  const held = heldCents(state);
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-rule px-5">
      <Link href="/" className="flex items-center gap-2.5" aria-label="CounterCall home">
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M6 0l6 6-6 6-6-6z" fill="currentColor" /></svg>
        <span className="display text-[14px] uppercase">CounterCall</span>
      </Link>
      <span className="cap hidden md:inline">Rice Robotics</span>
      <div className="ml-auto flex items-baseline gap-2.5">
        <span className="cap">Held</span>
        <span className="font-mono text-[18px] font-medium tabular-nums">{fmtCents(held)}</span>
      </div>
    </header>
  );
}

function Foot() {
  const { status, replay, resume } = useStream();
  const live = status === 'live';
  return (
    <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-rule px-5 text-[12px] text-fg-muted">
      <button type="button" onClick={resume} className="flex items-center gap-2" aria-live="polite">
        <i aria-hidden className={`h-1.5 w-1.5 ${live ? 'bg-verified' : status === 'replay' ? 'bg-signal-soft' : 'bg-held'}`} />
        {STATUS_TEXT[status]}
      </button>
      {replay && (
        <div className="flex items-center gap-2" aria-label="Replay controls">
          <span className="tabular-nums">{replay.name} · {replay.position}/{replay.total}</span>
          <button type="button" className={btn} onClick={replay.playing ? replay.pause : replay.play}>{replay.playing ? 'Pause' : 'Play'}</button>
          <button type="button" className={btn} onClick={replay.step}>Step</button>
          <button type="button" className={btn} onClick={replay.restart}>Restart</button>
          <button type="button" className={btn} onClick={() => replay.setSpeed(replay.speed === 1 ? 4 : 1)}>{replay.speed}x</button>
        </div>
      )}
      <span className="ml-auto hidden md:inline">J / K move between cases</span>
    </footer>
  );
}

function Providers({ children }: { children: ReactNode }) {
  const sp = useSearchParams(); const replay = sp.get('replay'); const atRaw = sp.get('at');
  return (
    <EventsProvider replay={replay} at={atRaw ? Number(atRaw) : null}>
      <div data-app className="night flex h-screen min-h-[720px] flex-col bg-surface text-fg"><Top /><div className="min-h-0 flex-1">{children}</div><Foot /></div>
    </EventsProvider>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  return <Suspense><Providers>{children}</Providers></Suspense>;
}
