'use client';
// /dev/stream?replay=fraud&speed=8: exercises the transport hook in a real browser (recorded-run replay needs no API). A test harness, not a product screen.
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventsProvider, useStream } from '@/components/EventsProvider';
import { fmtCents, heldCents } from '@/lib/selectors';

function Readout() {
  const { state, status, replay } = useStream();
  const speed = Number(useSearchParams().get('speed') ?? 1);
  useEffect(() => { replay?.setSpeed(speed); }, [replay?.name, speed]);   // eslint-disable-line react-hooks/exhaustive-deps
  const c = Object.values(state.cases)[0];
  return (
    <main data-app style={{ padding: 24 }}>
      <p id="status">{status}</p>
      <p id="pos">{replay ? `${replay.position}/${replay.total}` : '-'}</p>
      <p id="state">{c?.state ?? 'none'}</p>
      <p id="held">{fmtCents(heldCents(state))}</p>
      <p id="turns">{c?.call?.turns.length ?? 0}</p>
    </main>
  );
}
function Provided() {
  const replay = useSearchParams().get('replay');
  return <EventsProvider replay={replay}><Readout /></EventsProvider>;
}
export default function Page() {
  return <Suspense><Provided /></Suspense>;
}
