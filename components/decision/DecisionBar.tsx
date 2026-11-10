// The decision panel: why the system did what it did, in the policy's words (derived from the deterministic reason code, never written by a model).
// Release is human-only. Until the release dialog is wired, the action is shown with the reason it is or is not available.
import { Keycap } from '@/components/ui/Keycap';
import { CATEGORY_LABEL, REASON_TEXT } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';

const Row = ({ rule, text, effect }: { rule: string; text: string; effect: string }) => (
  <div className="grid grid-cols-[28px_1fr_auto] items-baseline gap-2 text-[13px] leading-5">
    <span className="label text-fg-muted">{rule}</span>
    <span className="flex min-w-0 items-baseline gap-2"><span className="truncate">{text}</span><i className="mb-1 h-px min-w-4 flex-1 border-t border-dotted border-rule" aria-hidden /></span>
    <span className="label">{effect}</span>
  </div>
);

export function DecisionBar({ c, onRelease }: { c: CaseView; onRelease?: () => void }) {
  const o = c.call?.outcome;
  const answered = c.call?.tools.filter((t) => t.name === 'report_answer').at(-1)?.args.answer;
  const canRelease = c.state === 'awaiting_approval' || c.state === 'fraud_blocked' || c.state === 'needs_human';
  const task = c.tasks.find((t) => t.status === 'open');
  const releaseNote = c.state === 'awaiting_approval' ? 'approve the change' : c.state === 'fraud_blocked' ? 'pay the on-file account only' : c.state === 'needs_human' ? 'override needs a written reason' : 'no outcome yet';
  return (
    <footer className="border-t border-dashed border-rule bg-surface-raised">
      <div className="label flex items-center justify-between px-3 py-1.5 text-fg-muted"><span>Decision · policy v1</span><span>{c.state === 'cleared' ? 'No action' : 'Payments stay held unless a person releases them'}</span></div>
      <div className="space-y-0.5 px-3 pb-2">
        {c.state === 'cleared' ? (
          <Row rule="R1" text={`${CATEGORY_LABEL[c.decision?.category ?? 'other'] ?? 'Email'}: no bank change detected`} effect="NO ACTION" />
        ) : (
          <>
            {c.decision && <Row rule="R1" text={`Email flagged: ${CATEGORY_LABEL[c.decision.category] ?? c.decision.category}`} effect={c.payments.length ? `HOLD ${c.payments.length} PAYMENTS` : c.decision.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS') ? 'HOLDING\u2026' : 'NO PAYMENTS'} />}
            {c.call && <Row rule="R2" text="Callback to the number on file" effect={o ? `ANSWERED: ${String(answered ?? 'none').toUpperCase().replace('_', ' ')}` : 'IN PROGRESS'} />}
            {o ? <Row rule="R3" text={REASON_TEXT[o.decision.reason].rule} effect={REASON_TEXT[o.decision.reason].effect} />
              : task && !c.call ? <Row rule="R2" text={task.reason} effect="HUMAN TASK" /> : null}
          </>
        )}
      </div>
      <div className="flex items-center gap-4 border-t border-dashed border-rule px-3 py-1.5">
        <span className="label flex items-center gap-1.5"><Keycap>H</Keycap> Keep held</span>
        <span className="label flex items-center gap-1.5 text-fg-muted"><Keycap>T</Keycap> Assign task</span>
        <button type="button" disabled={!canRelease || !onRelease} onClick={onRelease} title={onRelease ? releaseNote : `Release dialog is not wired yet (${releaseNote})`}
          className="label ml-auto flex items-center gap-1.5 border border-fg px-2 py-1 enabled:hover:bg-fg enabled:hover:text-surface disabled:border-rule disabled:text-fg-muted">
          <Keycap>R</Keycap> Release{'…'} <span className="normal-case tracking-normal text-fg-muted">({releaseNote})</span>
        </button>
      </div>
    </footer>
  );
}
