'use client';
// The app frame. A slim top bar (brand, org, the frozen-money total), the screen, and a quiet footer for connection state, replay controls and key hints.
// Present mode (P, Esc, ?present=1) hides the footer and scales the frame: components/ui/PresentMode.tsx.
// `?replay=<run>` swaps the live API for a recorded run (keyless, offline-safe, labelled REPLAY).
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { EventsProvider, useStream } from '@/components/EventsProvider';
import { HeldTicker } from '@/components/ui/HeldTicker';
import { AuditBadge } from '@/components/ui/AuditBadge';
import { PresentMode } from '@/components/ui/PresentMode';
import { badgeState } from '@/lib/audit-view';
import { heldCents } from '@/lib/selectors';
import { useAudit } from '@/lib/use-audit';

const STATUS_TEXT = { connecting: 'Connecting', live: 'Live', reconnecting: 'Reconnecting', paused: 'Paused · click to resume', replay: 'Replay' } as const;
const SPEEDS = [1, 2, 4, 0.5];
const THEMES = ['graphite', 'paper', 'cloud'] as const;
type Theme = (typeof THEMES)[number];

const NAV = [['/cases', 'Cases'], ['/vendors', 'Vendors'], ['/audit', 'Audit']] as const;
function Nav() {   // section links keep the query (?replay=, ?theme=) so a replay stays a replay
  const path = usePathname(); const qs = useSearchParams().toString();
  return <nav aria-label="Sections" className="flex items-center gap-1 text-[13px]">{NAV.map(([h, l]) => <Link key={h} href={qs ? `${h}?${qs}` : h} aria-current={path.startsWith(h) ? 'page' : undefined} className={`rounded-md px-2 py-1 ${path.startsWith(h) ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>{l}</Link>)}</nav>;
}

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
      <Nav />
      <div className="ml-auto flex items-baseline gap-2.5">
        <span className="cap">Payments on hold</span>
        <HeldTicker cents={held} />
      </div>
    </header>
  );
}

function AuditFoot() {   // the log check, quietly, next to the connection state; links to /audit and keeps the query like the nav
  const { state, status } = useStream(); const qs = useSearchParams().toString(); const replay = status === 'replay';
  const a = useAudit({ lastSeq: state.lastSeq, replay });
  if (replay || a.status === 'loading') return null;   // replay: the footer already says so, and the audit page explains the seal is checked live
  const kind = badgeState(a.report);
  return <Link href={qs ? `/audit?${qs}` : '/audit'} className="hover:text-fg"><AuditBadge kind={kind} compact /></Link>;
}

function Foot({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { status, replay, resume } = useStream();
  const live = status === 'live';
  const link = 'hover:text-fg hover:underline underline-offset-4';
  return (
    <footer data-present-hide className="relative flex h-9 shrink-0 items-center gap-5 border-t border-rule px-5 text-[12px] text-fg-muted">
      {replay && <i aria-hidden className="absolute -top-px left-0 h-px bg-fg/60 transition-[width] duration-[var(--d-base)]" style={{ width: `${(replay.position / Math.max(1, replay.total)) * 100}%` }} />}
      <button type="button" onClick={resume} className="flex items-center gap-2" aria-live="polite">
        <i aria-hidden className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-verified' : status === 'replay' ? 'bg-live' : 'bg-held'}`} />
        {STATUS_TEXT[status]}{replay ? ` of a recorded run` : ''}
      </button>
      <AuditFoot />
      {replay && (
        <div className="flex items-center gap-3" aria-label="Replay controls">
          <button type="button" className={link} onClick={replay.playing ? replay.pause : replay.play}>{replay.playing ? 'Pause' : 'Play'}</button>
          <button type="button" className={link} onClick={replay.step}>Step</button>
          <button type="button" className={link} onClick={replay.restart}>Restart</button>
          <button type="button" className={link} onClick={() => replay.setSpeed(SPEEDS[(SPEEDS.indexOf(replay.speed) + 1) % SPEEDS.length])} aria-label="Playback speed">{replay.speed}{'\u00d7'}</button>
        </div>
      )}
      <button type="button" className={`ml-auto ${link}`} onClick={() => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])} aria-label="Change theme">Theme: {theme}</button>
    </footer>
  );
}

function Providers({ children }: { children: ReactNode }) {
  const sp = useSearchParams(); const replay = sp.get('replay'); const atRaw = sp.get('at');
  const [theme, setThemeState] = useState<Theme>('graphite');
  useEffect(() => {   // ?theme= wins, then the last choice, then the default
    const q = sp.get('theme'); let stored: string | null = null;
    try { stored = localStorage.getItem('cc-theme'); } catch { /* storage can be blocked; the default is fine */ }
    const pick = [q, stored].find((x): x is Theme => THEMES.includes(x as Theme));
    if (pick) setThemeState(pick);
  }, [sp]);
  const setTheme = (t: Theme) => { setThemeState(t); try { localStorage.setItem('cc-theme', t); } catch { /* ignore */ } };
  return (
    <EventsProvider replay={replay} at={atRaw ? Number(atRaw) : null}>
      <div data-app data-theme={theme} className="flex h-screen min-h-[720px] flex-col bg-surface text-fg"><Top /><div className="min-h-0 flex-1">{children}</div><Foot theme={theme} setTheme={setTheme} /></div>
      <PresentMode theme={theme} />
    </EventsProvider>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  return <Suspense><Providers>{children}</Providers></Suspense>;
}
