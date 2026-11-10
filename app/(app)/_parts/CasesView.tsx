'use client';
// The cases screen: queue (360) + detail (rest). Selection follows the newest active case until the user picks one.
import { useEffect, useMemo, useState } from 'react';
import { QueuePanel } from '@/components/queue/QueuePanel';
import { CaseDetail } from './CaseDetail';
import { useStream } from '@/components/EventsProvider';
import { queue, GROUPS } from '@/lib/selectors';

export function CasesView() {
  const { state } = useStream();
  const [picked, setPicked] = useState<string | null>(null);
  const groups = useMemo(() => queue(state), [state]);
  const flat = useMemo(() => GROUPS.flatMap((g) => groups[g]), [groups]);
  // follow the newest case that is not a cleared/closed one until the user clicks something
  const followed = flat.find((c) => c.state !== 'cleared' && c.state !== 'closed' && c.state !== 'released')?.id ?? flat[0]?.id ?? null;
  const selectedId = picked ?? followed;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,[role=dialog]')) return;
      const i = flat.findIndex((c) => c.id === selectedId);
      if (e.key === 'j' && flat[i + 1]) setPicked(flat[i + 1].id);
      if (e.key === 'k' && flat[i - 1]) setPicked(flat[i - 1].id);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [flat, selectedId]);
  return (
    <div className="grid h-full grid-cols-[360px_minmax(0,1fr)]">
      <div className="min-h-0 border-r border-rule p-2"><QueuePanel groups={groups} selectedId={selectedId} onSelect={setPicked} listening="rice-ap@agentmail.to" /></div>
      <div className="min-h-0 p-2">{selectedId && state.cases[selectedId] ? <CaseDetail c={state.cases[selectedId]} /> : <div className="label p-4 text-fg-muted">Select a case</div>}</div>
    </div>
  );
}
