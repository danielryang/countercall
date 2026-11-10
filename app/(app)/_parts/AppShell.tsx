'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { EventsProvider, useStream } from '@/components/EventsProvider';
import { HeldTicker } from '@/components/ui/HeldTicker';
import { PresentMode } from '@/components/ui/PresentMode';
import { heldCents } from '@/lib/selectors';

const NAV = [['/cases', 'Cases', '⌂'], ['/vendors', 'Vendors', '▦'], ['/audit', 'Audit log', '≡']] as const;
const STATUS_TEXT = { connecting: 'Connecting', live: 'Live', reconnecting: 'Reconnecting', paused: 'Paused', replay: 'Replay' } as const;
const SPEEDS = [1, 2, 4, 0.5];

function Sidebar() {
  const path = usePathname();
  const qs = useSearchParams().toString();
  return <aside className="flex w-[232px] shrink-0 flex-col bg-surface-sunk px-3 py-4" data-present-hide>
    <Link href="/" className="flex items-center gap-2 px-3 pb-7" aria-label="CounterCall home"><span className="flex size-7 items-center justify-center rounded-md bg-dark"><i className="h-1 w-3 bg-solar" /></span><span className="display text-[17px]">CounterCall</span></Link>
    <div className="mb-5 border border-control bg-page px-3 py-2 text-[13px]">Rice Robotics <span className="float-right text-fg-muted">⌄</span></div>
    <nav aria-label="Sections" className="flex flex-col gap-1">{NAV.map(([href, label, icon]) => <Link key={href} href={qs ? `${href}?${qs}` : href} aria-current={path.startsWith(href) ? 'page' : undefined} className={`flex h-9 items-center gap-3 px-3 text-[14px] ${path.startsWith(href) ? 'bg-row text-fg' : 'text-fg-muted hover:text-fg'}`}><span aria-hidden className="w-4 text-center">{icon}</span>{label}{label === 'Cases' && <span className="ml-auto rounded-full bg-solar px-2 py-0.5 text-[12px] text-fg">3</span>}</Link>)}</nav>
    <div className="mt-8 flex flex-col gap-1 text-[14px] text-fg-muted"><div className="px-3 py-2">Expenses</div><div className="px-3 py-2">Cards</div><div className="px-3 py-2">Bill Pay</div><div className="px-3 py-2">Accounting</div></div>
    <div className="mt-auto flex flex-col gap-1 border-t border-rule pt-4 text-[14px] text-fg-muted"><Link href="/demo" className="px-3 py-2 hover:text-fg">Settings</Link><Link href="/" className="px-3 py-2 hover:text-fg">Help</Link></div>
  </aside>;
}

function Header() {
  const { state } = useStream();
  return <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-rule bg-page px-8"><div><p className="cap">Rice Robotics</p><p className="text-[14px]">Accounts payable</p></div><div className="flex items-center gap-3"><span className="cap">Payments on hold</span><HeldTicker cents={heldCents(state)} /></div></header>;
}

function Footer() {
  const { status, replay, resume } = useStream();
  return <footer data-present-hide className="flex h-9 shrink-0 items-center gap-4 border-t border-rule bg-page px-5 text-[12px] text-fg-muted"><button type="button" onClick={resume}>{STATUS_TEXT[status]}{replay ? ' · recorded run' : ''}</button>{replay && <div className="flex gap-3"><button type="button" onClick={replay.playing ? replay.pause : replay.play}>{replay.playing ? 'Pause' : 'Play'}</button><button type="button" onClick={replay.step}>Step</button><button type="button" onClick={replay.restart}>Restart</button><button type="button" onClick={() => replay.setSpeed(SPEEDS[(SPEEDS.indexOf(replay.speed) + 1) % SPEEDS.length])}>{replay.speed}×</button></div>}<span className="ml-auto">P for present mode</span></footer>;
}

function Providers({ children }: { children: ReactNode }) {
  const sp = useSearchParams(); const replay = sp.get('replay'); const at = sp.get('at');
  useEffect(() => { document.documentElement.removeAttribute('data-theme'); }, []);
  return <EventsProvider replay={replay} at={at ? Number(at) : null}><div data-app className="flex h-screen min-h-[720px] flex-col bg-page text-fg"><div className="flex min-h-0 flex-1"><Sidebar /><div className="flex min-w-0 flex-1 flex-col"><Header /><main className="min-h-0 flex-1">{children}</main></div></div><Footer /></div><PresentMode theme="ramp" /></EventsProvider>;
}
export function AppShell({ children }: { children: ReactNode }) { return <Suspense><Providers>{children}</Providers></Suspense>; }
