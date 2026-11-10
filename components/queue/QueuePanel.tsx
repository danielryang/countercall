'use client';
// The queue, grouped by what needs a human. Resolved history is collapsed to one line so the screen stays calm.
import { useState } from 'react';
import type { CaseView } from '@/lib/reducer';
import { GROUPS, type QueueGroup } from '@/lib/selectors';
import { QueueRow } from './QueueRow';

export function QueuePanel({ groups, selectedId, onSelect, listening }: { groups: Record<QueueGroup, CaseView[]>; selectedId: string | null; onSelect: (id: string) => void; listening: string }) {
  const [showResolved, setShowResolved] = useState(false);
  const total = GROUPS.reduce((n, g) => n + groups[g].length, 0);
  return (
    <nav aria-label="Cases" className="h-full overflow-y-auto px-2 pb-4">
      <div className="px-3 pt-4 text-[16px] font-semibold">Cases</div>
      <p className="cap px-3 pb-2 pt-1">Every email to the AP inbox is checked. A suspicious bank change is put on hold and verified by phone.</p>
      {total === 0 ? (
        <div className="cap m-4 border border-dashed border-rule p-4">Watching {listening}<span className="scan-dots" /></div>
      ) : (
        GROUPS.filter((g) => groups[g].length).map((g) => {
          const resolved = g === 'RESOLVED';
          const open = !resolved || showResolved || groups[g].some((c) => c.id === selectedId);
          return (
            <div key={g} className="mt-2">
              <button type="button" disabled={!resolved} onClick={() => setShowResolved((v) => !v)} className="cap flex w-full items-center gap-2 px-3 py-1.5 text-left enabled:hover:text-fg">
                <span>{g === 'NEEDS ACTION' ? 'Needs action' : g === 'IN PROGRESS' ? 'In progress' : 'Resolved'}</span>
                <span className="tabular-nums">{groups[g].length}</span>
                {resolved && <span aria-hidden className="ml-auto">{open ? '▾' : '▸'}</span>}
              </button>
              {open && groups[g].map((c) => <QueueRow key={c.id} c={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} dim={resolved} />)}
            </div>
          );
        })
      )}
    </nav>
  );
}
