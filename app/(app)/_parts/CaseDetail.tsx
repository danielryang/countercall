'use client';
// The case file that assembles itself. Left: the email with evidence. Right: phase panels (checks, payments, trusted number) that collapse to receipt lines
// once the call starts, so exactly one focal element is on screen per beat; the call card takes the freed space.
import { CallPanel } from '@/components/call/CallPanel';
import { CaseHeader } from '@/components/case/CaseHeader';
import { ChecksPanel } from '@/components/case/ChecksPanel';
import { EmailPane } from '@/components/case/EmailPane';
import { PaymentsPanel } from '@/components/case/PaymentsPanel';
import { TrustedNumberCard } from '@/components/case/TrustedNumberCard';
import { DecisionBar } from '@/components/decision/DecisionBar';
import { Frame } from '@/components/ui/Frame';
import { PhasePanel } from '@/components/ui/PhasePanel';
import { CATEGORY_LABEL, SOURCE_LABEL } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

export function CaseDetail({ c }: { c: CaseView }) {
  const fails = c.signals.filter((s) => s.severity === 'high' || s.severity === 'critical').length;
  const calling = !!c.call;
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  const ct = c.call?.contact;
  return (
    <Frame className="flex h-full flex-col bg-surface">
      <CaseHeader c={c} />
      <div className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)]">
        <div className="min-h-0 border-r border-dashed border-rule">
          <div className="label border-b border-dashed border-rule px-3 py-1.5 text-fg-muted">01 / Email · text only</div>
          <div className="h-[calc(100%-2rem)]"><EmailPane c={c} /></div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <PhasePanel index="02" title="Checks" collapsed={calling || c.payments.length > 0}
            summary={c.state === 'cleared' ? `No bank change detected · model: ${CATEGORY_LABEL[c.extraction?.category ?? 'other']}` : `${fails} of ${c.signals.length} rules failed · model: ${CATEGORY_LABEL[c.extraction?.category ?? 'other'] ?? 'pending'}`}>
            <ChecksPanel c={c} />
          </PhasePanel>
          {(c.payments.length > 0 || c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS')) && (
            <PhasePanel index="03" title="Payments" collapsed={calling} summary={c.payments.length ? `${c.release ? 'released' : 'frozen'} · ${fmtCents(cents)}` : 'freezing\u2026'}>
              <PaymentsPanel c={c} />
            </PhasePanel>
          )}
          {(c.trusted || ct) && (
            <PhasePanel index="04" title="Number on file" collapsed={calling}
              summary={`${ct?.phoneMasked ?? c.trusted?.phoneMasked}${ct ? ` · ${SOURCE_LABEL[ct.source] ?? ct.source} · ${ct.firstSeenAt.slice(0, 10)}` : ''}`}>
              <TrustedNumberCard c={c} />
            </PhasePanel>
          )}
          {calling && <div className="min-h-0 flex-1 border-t border-dashed border-rule"><CallPanel c={c} /></div>}
        </div>
      </div>
      <DecisionBar c={c} />
    </Frame>
  );
}
