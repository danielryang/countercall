'use client';
// The vendors screen: directory (left) and the selected vendor's file (right). Reads GET /api/vendors (masked, read-only) and refetches when the
// event stream moves, so held amounts follow the cases. In replay mode there is no vendor data to replay, and the screen says so instead of
// mixing live database rows into a recorded run.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStream } from '@/components/EventsProvider';
import { Card } from '@/components/ui/Card';
import { VendorFile } from '@/components/vendors/VendorFile';
import { VendorTable } from '@/components/vendors/VendorTable';
import { VENDORS } from '@/lib/copy';
import type { VendorEntry } from '@/lib/vendors';

type Load = { kind: 'loading' } | { kind: 'ok'; vendors: VendorEntry[] } | { kind: 'error'; unauthorized: boolean };

export function VendorsView() {
  const { replay, state } = useStream();
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
    <div className="flex h-full items-center justify-center p-5">
      <Card className="max-w-[440px] p-5">
        <p className="text-[14px] leading-5">{VENDORS.replayNote}</p>
        <Link href="/vendors" className="mt-3 inline-block text-[13px] underline underline-offset-4 hover:text-fg-muted">{VENDORS.replayLink}</Link>
      </Card>
    </div>
  );

  const vendors = load.kind === 'ok' ? load.vendors : [];
  const selected = vendors.find((v) => v.id === picked) ?? vendors[0] ?? null;
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_400px] gap-4 p-5">
      <Card title={VENDORS.title} aside={load.kind === 'ok' && vendors.length ? `${vendors.length} ${VENDORS.seeded}` : undefined} className="overflow-hidden">
        <p className="cap px-5 pb-3">{VENDORS.intro}</p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {load.kind === 'loading' && <p className="cap px-5 py-2">{VENDORS.loading}<span className="scan-dots" /></p>}
          {load.kind === 'error' && <p className="px-5 py-2 text-[13px]">{load.unauthorized ? VENDORS.unauthorized : VENDORS.error}</p>}
          {load.kind === 'ok' && (vendors.length
            ? <VendorTable vendors={vendors} selectedId={selected?.id ?? null} onSelect={setPicked} />
            : <p className="cap mx-5 rounded-lg border border-dashed border-rule p-4">{VENDORS.empty}</p>)}
        </div>
      </Card>
      <Card className="overflow-hidden">{selected ? <VendorFile key={selected.id} v={selected} /> : <div className="cap p-5">{load.kind === 'loading' ? VENDORS.loading : ''}</div>}</Card>
    </div>
  );
}
