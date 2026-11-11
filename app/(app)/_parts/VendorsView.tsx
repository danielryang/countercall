'use client';
// The vendors screen, in Ramp's two page shapes: the list (page header + table) and one vendor (breadcrumb back + the vendor page). Reads GET /api/vendors
// (masked, read-only) and refetches when the event stream moves, so held amounts follow the cases. In replay mode there is no vendor data to replay,
// and the screen says so instead of mixing live database rows into a recorded run.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useStream } from '@/components/EventsProvider';
import { Avatar } from '@/components/ui/Avatar';
import { VendorFile } from '@/components/vendors/VendorFile';
import { VendorTable } from '@/components/vendors/VendorTable';
import { VENDORS } from '@/lib/copy';
import type { VendorEntry } from '@/lib/vendors';

type Load = { kind: 'loading' } | { kind: 'ok'; vendors: VendorEntry[] } | { kind: 'error'; unauthorized: boolean };

function Header({ count }: { count?: number }) {
  return (
    <>
      <div className="flex items-end justify-between gap-6">
        <h1 className="display text-[44px] leading-[48px]">{VENDORS.title}</h1>
        {count ? <p className="pb-1.5 text-[15px] text-fg-muted">{count} {VENDORS.seeded}</p> : null}
      </div>
    </>
  );
}

export function VendorsView() {
  const { replay, state } = useStream();
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [picked, setPicked] = useState<string | null>(null);
  const seq = state.lastSeq;
  const first = useRef(true);

  useEffect(() => {
    if (replay) return;
    // No abort on a new seq: while the stream catches up, seq changes many times a second, and aborting would keep the list loading.
    // A short delay coalesces those bursts into one request (the first one goes at once); a request that started always completes.
    const t = setTimeout(() => {
      fetch('/api/vendors', { cache: 'no-store' })
        .then(async (r) => {
          if (r.ok) setLoad({ kind: 'ok', vendors: (await r.json()).vendors });
          else setLoad((l) => (l.kind === 'ok' ? l : { kind: 'error', unauthorized: r.status === 401 }));
        })
        .catch(() => setLoad((l) => (l.kind === 'ok' ? l : { kind: 'error', unauthorized: false })));
    }, first.current ? 0 : 400);
    first.current = false;
    return () => clearTimeout(t);
  }, [replay, seq]);

  if (replay) return (
    <div className="px-10 pt-7">
      <Header />
      <div className="mt-8 flex max-w-[720px] items-center gap-3 rounded-sm border border-rule-strong bg-surface-raised px-5 py-4 text-[16px]">
        <span className="flex-1">{VENDORS.replayNote}</span>
        <Link href="/vendors" className="shrink-0 underline underline-offset-4 hover:text-fg-muted">{VENDORS.replayLink} {'→'}</Link>
      </div>
    </div>
  );

  const vendors = load.kind === 'ok' ? load.vendors : [];
  const selected = picked ? vendors.find((v) => v.id === picked) ?? null : null;
  if (selected) return (
    <div className="h-full overflow-y-auto px-10 pb-8 pt-6">
      <button type="button" onClick={() => setPicked(null)} className="flex w-fit items-center gap-1.5 text-[15px] text-fg-muted hover:text-fg">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M13 8H3M7 4L3 8l4 4" /></svg>
        {VENDORS.title}
      </button>
      <div className="mt-2 flex items-center gap-4">
        <Avatar name={selected.name} size={44} />
        <h1 className="display min-w-0 flex-1 truncate text-[40px] leading-[46px]">{selected.name}</h1>
      </div>
      <div className="mt-7"><VendorFile key={selected.id} v={selected} onCases={() => router.push('/cases?view=list')} /></div>
    </div>
  );
  return (
    <div className="h-full overflow-y-auto px-10 pb-8 pt-7">
      <Header count={load.kind === 'ok' ? vendors.length : undefined} />
      <div className="mt-7">
        {load.kind === 'loading' && <p className="border-y border-rule px-4 py-10 text-center text-[15px] text-fg-muted">{VENDORS.loading}<span className="scan-dots" /></p>}
        {load.kind === 'error' && <p className="border-y border-rule px-4 py-10 text-center text-[15px]">{load.unauthorized ? VENDORS.unauthorized : VENDORS.error}</p>}
        {load.kind === 'ok' && (vendors.length
          ? <VendorTable vendors={vendors} selectedId={null} onSelect={setPicked} />
          : <p className="border-y border-rule px-4 py-10 text-center text-[15px] text-fg-muted">{VENDORS.empty}</p>)}
      </div>
    </div>
  );
}
