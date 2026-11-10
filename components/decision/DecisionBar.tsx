// The decision: why the system did what it did, in the policy's words (derived from the deterministic reason code, never written by a model).
// Before an outcome it is a single line. Release is human-only; until the dialog is wired the action says why it is or is not available.
import { CATEGORY_LABEL, REASON_TEXT } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';

const Row = ({ n, text, effect }: { n: string; text: string; effect: string }) => (
  <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-baseline gap-2 py-0.5 text-[13px] leading-5">
    <span className="cap font-mono">{n}</span><span className="truncate">{text}</span><span className="cap text-fg">{effect}</span>
  </div>
);

export function DecisionBar({ c, onRelease }: { c: CaseView; onRelease?: () => void }) {
  const o = c.call?.outcome;
  const answered = c.call?.tools.filter((t) => t.name === 'report_answer').at(-1)?.args.answer;
  const canRelease = c.state === 'awaiting_approval' || c.state === 'fraud_blocked' || c.state === 'needs_human';
  const task = c.tasks.find((t) => t.status === 'open');
  const releaseNote = c.state === 'awaiting_approval' ? 'approve the change' : c.state === 'fraud_blocked' ? 'pay the on-file account' : c.state === 'needs_human' ? 'written reason required' : 'waiting for an outcome';
  const holding = c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS');
  return (
    <footer className="border-t border-rule bg-surface-sunk px-6 py-3">
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          {c.state === 'cleared' ? <Row n="R1" text={`${CATEGORY_LABEL[c.decision?.category ?? 'other'] ?? 'Email'}: no bank change detected`} effect="No action" />
            : !o ? <Row n="R1" text={c.call ? 'Verification call in progress' : task ? task.reason : holding ? 'Payments held until the vendor is called' : 'Reading the email'} effect={c.payments.length ? `${c.payments.length} payments held` : 'Held'} />
            : <>
              {c.decision && <Row n="R1" text={`Flagged: ${CATEGORY_LABEL[c.decision.category] ?? c.decision.category}`} effect={`${c.payments.length} payments held`} />}
              <Row n="R2" text="Called the number on file" effect={`Answered: ${String(answered ?? 'none').replace('_', ' ')}`} />
              <Row n="R3" text={REASON_TEXT[o.decision.reason].rule} effect={REASON_TEXT[o.decision.reason].effect.replace(' · ', ', ').toLowerCase()} />
            </>}
        </div>
        <button type="button" disabled={!canRelease || !onRelease} onClick={onRelease} title={onRelease ? releaseNote : `Release dialog is not wired yet (${releaseNote})`}
          className="shrink-0 border border-fg px-3 py-1.5 text-[13px] enabled:hover:bg-fg enabled:hover:text-surface disabled:border-rule disabled:text-fg-muted">
          Release{'…'} <span className="cap ml-1 text-inherit">{releaseNote}</span>
        </button>
      </div>
      <p className="cap mt-1.5">Payments stay held unless a person releases them. The model reports; code decides.</p>
    </footer>
  );
}
