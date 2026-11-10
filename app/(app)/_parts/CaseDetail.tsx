'use client';
// The case file that assembles itself. Left: the email with evidence. Right: phase panels that collapse to one-line receipts as the story advances, so exactly one
// focal element is on screen per beat; the call takes the freed space.
import { CallPanel } from '@/components/call/CallPanel';
import { CaseHeader } from '@/components/case/CaseHeader';
import { ChecksPanel } from '@/components/case/ChecksPanel';
import { EmailPane } from '@/components/case/EmailPane';
import { PaymentsPanel } from '@/components/case/PaymentsPanel';
import { TrustedNumberCard } from '@/components/case/TrustedNumberCard';
import { DecisionBar } from '@/components/decision/DecisionBar';
import { PhasePanel } from '@/components/ui/PhasePanel';
import { CATEGORY_LABEL, SOURCE_LABEL } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

export function CaseDetail({ c }: { c: CaseView }) {
  const fails = c.signals.filter((s) => s.severity === 'high' || s.severity === 'critical').length;
  const calling = !!c.call;
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  const ct = c.call?.contact;
  const holding = c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS');
  return (
    <div className="flex h-full min-h-0 flex-col">
      <CaseHeader c={c} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-h-0 border-r border-rule"><EmailPane c={c} /></div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <PhasePanel title="Checks" collapsed={calling || c.payments.length > 0}
            summary={c.state === 'cleared' ? 'No bank change detected' : `${fails} of ${c.signals.length} rules failed · ${CATEGORY_LABEL[c.extraction?.category ?? 'other']}`}>
            <ChecksPanel c={c} />
          </PhasePanel>
          {(c.payments.length > 0 || holding) && (
            <PhasePanel title="Payments" collapsed={calling || !c.payments.length} summary={c.payments.length ? `${c.release ? 'Released' : 'Frozen'} · ${fmtCents(cents)}` : 'Freezing…'}>
              <PaymentsPanel c={c} />
            </PhasePanel>
          )}
          {(c.trusted || ct) && (
            <PhasePanel title="Number on file" collapsed={calling} summary={`${ct?.phoneMasked ?? c.trusted?.phoneMasked}${ct ? ` · ${SOURCE_LABEL[ct.source] ?? ct.source}` : ''}`}>
              <TrustedNumberCard c={c} />
            </PhasePanel>
          )}
          {calling && <div className="min-h-0 flex-1"><CallPanel c={c} /></div>}
        </div>
      </div>
      <DecisionBar c={c} />
    </div>
  );
}
