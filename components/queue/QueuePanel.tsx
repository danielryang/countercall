// The queue: grouped by what needs a human. Empty and loading states are dashed boxes, never shimmer.
import { Frame } from '@/components/ui/Frame';
import { Keycap } from '@/components/ui/Keycap';
import type { CaseView } from '@/lib/reducer';
import { GROUPS, type QueueGroup } from '@/lib/selectors';
import { QueueRow } from './QueueRow';

export function QueuePanel({ groups, selectedId, onSelect, listening }: { groups: Record<QueueGroup, CaseView[]>; selectedId: string | null; onSelect: (id: string) => void; listening: string }) {
  const total = GROUPS.reduce((n, g) => n + groups[g].length, 0);
  return (
    <Frame label="Cases" aside={<span className="inline-flex gap-1"><Keycap>J</Keycap><Keycap>K</Keycap></span>} className="h-full overflow-y-auto bg-surface">
      {total === 0 ? (
        <div className="m-3 border border-dashed border-rule p-4 label text-fg-muted">No emails yet · watching {listening}<span className="scan-dots" /></div>
      ) : (
        GROUPS.filter((g) => groups[g].length).map((g) => (
          <div key={g}>
            <div className="label flex items-center justify-between bg-surface-sunk px-3 py-1 text-fg-muted"><span>{g}</span><span className="tabular-nums">{groups[g].length}</span></div>
            {groups[g].map((c) => <QueueRow key={c.id} c={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />)}
          </div>
        ))
      )}
    </Frame>
  );
}
