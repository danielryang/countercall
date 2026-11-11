'use client';
// The cases screen, in Ramp's two page shapes: the list (page header + table) and one case (breadcrumb back to the list + the case page).
// `?view=list` shows the list (the sidebar's Cases link opens it); without it the screen shows one case. Selection follows the newest active case until
// the user picks one, so a replay URL always lands on the case being told.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CaseTable } from '@/components/queue/CaseTable';
import { CaseDetail } from './CaseDetail';
import { useStream } from '@/components/EventsProvider';
import { fmtCents, heldCents, queue, GROUPS } from '@/lib/selectors';

export function CasesView() {
  const { state, replay } = useStream();
  const sp = useSearchParams(); const router = useRouter(); const path = usePathname();
  const list = sp.get('view') === 'list';
  const [picked, setPicked] = useState<string | null>(null);
  const groups = useMemo(() => queue(state), [state]);
  const flat = useMemo(() => GROUPS.flatMap((g) => groups[g]), [groups]);
  const followed = flat.find((c) => c.state !== 'cleared' && c.state !== 'closed' && c.state !== 'released')?.id ?? flat[0]?.id ?? null;
  const selectedId = picked ?? followed;
  const show = (toList: boolean) => {   // keep every other query param (?replay=, ?at=) so a replay stays a replay
    const q = new URLSearchParams(sp.toString());
    if (toList) q.set('view', 'list'); else q.delete('view');
    const s = q.toString();
    router.push(s ? `${path}?${s}` : path, { scroll: false });
  };
  const open = (id: string) => { setPicked(id); if (list) show(false); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,[role=dialog]')) return;
      const i = flat.findIndex((c) => c.id === selectedId);
      if (e.key === 'j' && flat[i + 1]) setPicked(flat[i + 1].id);
      if (e.key === 'k' && flat[i - 1]) setPicked(flat[i - 1].id);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [flat, selectedId]);
  const c = selectedId ? state.cases[selectedId] : undefined;

  if (list || !c) {
    const held = heldCents(state);
    return (
      <div className="flex h-full min-h-0 flex-col px-10 pt-7">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="display text-[44px] leading-[48px]">Cases</h1>
            <p className="mt-1 text-[15px] text-fg-muted">Every email to <span className="text-fg">rice-ap@agentmail.to</span> is checked.</p>
          </div>
          {!replay && <Link href="/demo" className="btn mb-1">New test case</Link>}
        </div>
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto"><CaseTable groups={groups} selectedId={selectedId} onOpen={open} /></div>
        {flat.length > 0 && (
          <div className="-mx-10 flex shrink-0 items-center justify-end gap-2 border-t border-rule bg-surface-raised px-10 py-2.5 text-[14px] text-fg-muted">
            <span>{flat.length} case{flat.length === 1 ? '' : 's'}</span><span aria-hidden>{'·'}</span><span><span className="font-mono text-fg">{fmtCents(held)}</span> on hold</span>
          </div>
        )}
      </div>
    );
  }
  return <CaseDetail c={c} onBack={() => show(true)} />;
}
