'use client';
// One case, told as a story: a plain headline, the email that triggered it, and the four steps CounterCall took.
import { CaseStory } from '@/components/case/CaseStory';
import { EmailPane } from '@/components/case/EmailPane';
import { StatusBanner } from '@/components/case/StatusBanner';
import { Card } from '@/components/ui/Card';
import type { CaseView } from '@/lib/reducer';

export function CaseDetail({ c }: { c: CaseView }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <StatusBanner c={c} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4">
        <Card title="The email" aside="text only"><EmailPane c={c} /></Card>
        <div className="min-h-0 overflow-y-auto pr-1">
          <h2 className="px-2 pb-1 pt-1 text-[14px] font-medium">What CounterCall did</h2>
          <CaseStory key={c.id} c={c} />
        </div>
      </div>
    </div>
  );
}
