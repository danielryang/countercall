'use client';
// "What CounterCall did": four steps in plain language. The current step is open; finished steps are one line each and open on click. A first-time viewer can read
// top to bottom and understand the whole product: flag the email, hold the money, phone the vendor on the number we already had, and show the result.
import { useId, useState, type ReactNode } from 'react';
import { CallTranscript, answerTurn } from '@/components/call/CallPanel';
import { EVIDENCE_HINT, plainReasonGroups, REASONS, plainTask, REASON_TEXT, SOURCE_LABEL, STAMP } from '@/lib/copy';
import { evidenceMap, hasEvidence, overlaps } from '@/lib/evidence';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

type Key = 'email' | 'hold' | 'call' | 'result' | 'release';
type St = 'done' | 'active' | 'pending' | 'warn';
/** `shrink`: the open body may give up height (its own inner box scrolls) so the steps below it stay on the 1280x720 stage. `hot`: the summary line is lit. */
interface Step { key: Key; title: string; summary: string; st: St; body: ReactNode; shrink?: boolean; hot?: boolean }
/** Reasons shown before the quiet "+N more" disclosure. */
const TOP_REASONS = 5;

function Icon({ st }: { st: St }) {
  const base = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold';
  if (st === 'done') return <span className={`${base} border-verified bg-verified text-ink`} aria-label="done">{'\u2713'}</span>;
  if (st === 'active') return <span className={`${base} border-fg`} aria-label="in progress"><i className="h-2 w-2 animate-blink rounded-full bg-fg" /></span>;
  if (st === 'warn') return <span className={`${base} border-held bg-held text-ink`} aria-label="needs attention">!</span>;
  return <span className={`${base} border-rule`} aria-label="waiting" />;
}

const md = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** One plain sentence under the result, only where it adds something the headline does not. */
const RESULT_TEXT: Partial<Record<CaseView['state'], string>> = {
  fraud_blocked: 'A person can still release the payments to the account already on file.',
  awaiting_approval: 'Review and approve before any payment moves or the bank account changes.',
  needs_human: 'A task was created for your team. The payments stay on hold.',
};

export function CaseStory({ c, onRelease, releaseBlocked, hot, onHot }: {
  c: CaseView; onRelease?: () => void; releaseBlocked?: string;
  /** signal ids lit up by the email pane (or by a row here); the case detail owns this state */
  hot?: string[] | null; onHot?: (ids: string[] | null) => void;
}) {
  const [open, setOpen] = useState<Partial<Record<Key, boolean>>>({});
  const [more, setMore] = useState(false);
  const hintId = useId();
  const v = c.vendorName ?? 'the vendor';
  const groups = plainReasonGroups(c);
  const reasons = groups.map((g) => g.text);
  const ev = evidenceMap(c);
  const linkIds = (g: { ids: string[] }) => g.ids.filter((i) => hasEvidence(ev, i));     // only reasons with something in the email to point at are link targets
  // Every reason linked to the email stays reachable: past the top five, a hidden reason whose evidence is being pointed at is shown anyway (lit) until
  // the pointer leaves, and the step's one-line summary names the lit reason while the step is closed.
  const hotGroup = hot ? groups.find((g) => overlaps(linkIds(g), hot)) : undefined;
  const hidden = more ? [] : groups.slice(TOP_REASONS);
  const peek = hidden.filter((g) => g === hotGroup);
  const rows = more ? groups : [...groups.slice(0, TOP_REASONS), ...peek];
  const holding = !!c.decision?.actions.some((a) => a.type === 'HOLD_VENDOR_PAYMENTS');
  const o = c.call?.outcome;
  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  const ct = c.call?.contact;
  const phone = ct?.phoneMasked ?? c.trusted?.phoneMasked;
  const cleared = c.state === 'cleared';
  const ans = c.call ? c.call.turns[answerTurn(c.call.turns)]?.text : undefined;
  const canRelease = (c.state === 'awaiting_approval' || c.state === 'fraud_blocked' || c.state === 'needs_human') && !c.release;
  const steps: Step[] = [];

  steps.push({
    key: 'email', st: c.decision ? 'done' : 'active',
    title: cleared ? 'Checked the email: nothing suspicious' : c.decision ? 'Flagged as suspicious' : 'Reading the email',
    hot: !!hotGroup,
    summary: cleared ? '' : hotGroup ? hotGroup.text : reasons.length ? `${reasons.length} warning sign${reasons.length === 1 ? '' : 's'}` : 'Looking for signs of a fake request',
    body: groups.length ? (
      <ul className="-mx-1.5 space-y-0.5 text-[14px] leading-5">
        {rows.map((g) => {
          const ids = linkIds(g);
          const live = ids.length > 0 && !!onHot;
          return (
            <li key={g.text} className={`flex gap-2 rounded-md px-1.5 py-0.5 data-[hot=true]:bg-surface-raised ${live ? 'cursor-default' : ''}`} {...(live ? {
              tabIndex: 0, 'data-hot': overlaps(ids, hot ?? null) || undefined, 'aria-describedby': hintId,
              onMouseEnter: () => onHot!(ids), onMouseLeave: () => onHot!(null), onFocus: () => onHot!(ids), onBlur: () => onHot!(null),
            } : {})}>
              <span aria-hidden className="mt-px text-blocked">{'✕'}</span><span>{g.text}</span>
            </li>
          );
        })}
        {hidden.length > peek.length && (
          <li><button type="button" aria-expanded={false} onClick={() => setMore(true)} className="rounded-md px-1.5 py-0.5 text-[13px] text-fg-muted hover:bg-surface-raised hover:text-fg">{REASONS.more(hidden.length - peek.length)}</button></li>
        )}
        {more && groups.length > TOP_REASONS && (
          <li><button type="button" aria-expanded onClick={() => setMore(false)} className="rounded-md px-1.5 py-0.5 text-[13px] text-fg-muted hover:bg-surface-raised hover:text-fg">{REASONS.fewer}</button></li>
        )}
        <li className="cap px-1.5 pt-1">Fixed rules decide. An AI model only adds context and can never clear a flag or release money.{onHot && groups.some((g) => g.ids.some((i) => hasEvidence(ev, i))) ? <span id={hintId}> {EVIDENCE_HINT}</span> : null}</li>
      </ul>
    ) : <p className="cap">Nothing unusual was found.</p>,
  });

  if (!cleared && (holding || c.payments.length)) steps.push({
    key: 'hold', st: c.payments.length ? 'done' : 'active',
    title: 'Put the payments on hold', summary: c.payments.length ? `${fmtCents(cents)} across ${c.payments.length} invoices` : 'Freezing the scheduled payments',
    body: (
      <div>
        {c.payments.map((b) => (
          <div key={b.paymentId} className="flex items-center gap-3 py-1.5 text-[14px]">
            <i aria-hidden className={`h-5 w-5 shrink-0 rounded-sm border border-rule ${c.release ? 'bg-verified' : 'frozen'}`} />
            <span className="flex-1">Invoice {b.invoiceNumber} <span className="text-fg-muted">due {md(b.dueDate)}</span></span>
            <span className="font-mono tabular-nums">{fmtCents(b.amountCents)}</span>
          </div>
        ))}
        <p className="cap pt-1">{c.rampMode === 'sandbox' ? 'Held through Ramp sandbox.' : 'Held through a mock of the Ramp API (no real money moves in this demo).'}</p>
      </div>
    ),
  });

  const openTask = c.tasks.find((t) => t.status === 'open');
  const skipped = !cleared && !c.call && c.state === 'needs_human' && !!openTask;   // the phone check never ran (calls off, unapproved sender, ...)
  const callExpected = !cleared && (c.call || c.trusted || c.state === 'held' || c.state === 'calling' || skipped);
  if (callExpected) steps.push({
    key: 'call', shrink: !!c.call, st: o ? 'done' : c.call ? 'active' : skipped ? 'warn' : 'pending',
    title: skipped ? 'Phone check did not run' : c.call ? `Called ${v} on the number we already had` : `Call ${v} on the number we already had`,
    summary: skipped ? plainTask(openTask!.reason) : phone ?? 'Finding the number on file',
    body: (
      <div className="flex min-h-0 flex-col gap-3">
        <p className="shrink-0 text-[13px] leading-5 text-fg-muted" title={ct?.sourceDoc ?? undefined}>{phone ? <><span className="font-mono text-fg">{phone}</span> {'\u00b7'} from {ct ? `${SOURCE_LABEL[ct.source] ?? ct.source}, added ${ct.firstSeenAt.slice(0, 10)}` : 'the vendor record'} {'\u00b7'} <b className="font-medium text-fg">not</b> from the email</> : 'Looking up the verified number.'}</p>
        {c.call && <CallTranscript c={c} />}
      </div>
    ),
  });

  const resultTitle = o ? STAMP[o.decision.outcome].word : cleared ? 'Nothing to do' : c.state === 'needs_human' ? 'Needs a person' : 'Waiting';
  steps.push({
    key: 'result', st: o || cleared ? (c.state === 'needs_human' ? 'warn' : 'done') : c.state === 'needs_human' ? 'warn' : 'pending',
    title: o || cleared || c.state === 'needs_human' ? `Result: ${resultTitle}` : 'Result',
    summary: o ? REASON_TEXT[o.decision.reason].rule : cleared ? 'Cleared' : c.state === 'needs_human' ? plainTask(c.tasks.find((t) => t.status === 'open')?.reason ?? 'Needs a person') : 'Waiting for the call',
    body: (
      <div className="space-y-3 text-[14px] leading-5">
        {ans && <p className="rounded-lg border border-rule bg-surface px-3 py-2"><span className="cap block">{v} said</span><span className="ev" data-verdict={c.state === 'fraud_blocked' ? 'no' : c.state === 'awaiting_approval' ? 'yes' : undefined}>{ans}</span></p>}
        {RESULT_TEXT[c.state] && <p>{RESULT_TEXT[c.state]}</p>}
        {canRelease && (   // only when there is something a person can release: nothing to click on a cleared or in-progress case
          <div className="flex items-center gap-3">
            <button type="button" disabled={!canRelease || !onRelease} onClick={onRelease} title={!onRelease ? (releaseBlocked ?? 'Approval is not available here') : canRelease ? 'Review and approve' : 'Nothing to release yet'}
              className="shrink-0 whitespace-nowrap rounded-lg border border-fg px-3 py-1.5 text-[13px] enabled:hover:bg-fg enabled:hover:text-surface disabled:cursor-not-allowed disabled:border-rule disabled:text-fg-muted">Review and release{'…'}</button>
          </div>
        )}
      </div>
    ),
  });

  if (c.release) steps.push({
    key: 'release', st: 'done', title: `Released by ${c.release.approvedBy}`,
    summary: c.release.destination === 'on_file' ? 'Paid to the account already on file' : 'New bank account approved (Ramp still has to approve it)',
    body: (
      <div className="space-y-1 text-[14px] leading-5">
        <p>{fmtCents(cents)} was released to {c.release.destination === 'on_file' ? 'the account we already had on file' : 'the new bank account, pending Ramp\u2019s own approval'}.</p>
        {c.release.note && <p className="text-fg-muted">Reason given: {c.release.note}</p>}
        <p className="cap">Approved by a person, recorded in the audit log.</p>
      </div>
    ),
  });

  const current = [...steps].reverse().find((s) => s.st === 'active' || s.st === 'warn')?.key ?? (o ? 'result' : steps[steps.length - 1].key);   // the latest step that needs attention
  const isOpenOf = (s: Step) => open[s.key] ?? s.key === current;
  const opened = steps.filter(isOpenOf);
  const fitKey = opened.length === 1 && opened[0].shrink ? opened[0].key : null;
  return (
    // A flex column so the open call step (its transcript scrolls inside) can shrink to keep Result and the timing toggle on the stage. Only when it is the ONE
    // open step: with a second step opened on demand nothing shrinks and the column scrolls instead, so open bodies never overlap.
    <ol className={`flex flex-col gap-0.5 ${fitKey ? 'min-h-0' : 'shrink-0'}`} aria-label="What CounterCall did">
      {steps.map((s, i) => {
        const isOpen = isOpenOf(s);
        const fit = s.key === fitKey;
        return (
          <li key={s.key} className={`relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-4 ${fit ? 'min-h-0 grid-rows-[minmax(0,1fr)]' : 'shrink-0'}`}>
            {i < steps.length - 1 && <span aria-hidden className={`absolute left-[11.5px] top-7 h-[calc(100%-1.5rem)] w-px ${s.st === 'done' ? 'bg-verified/60' : 'bg-rule'}`} />}
            <div className="pt-2.5"><Icon st={s.st} /></div>
            <div className={`min-w-0 ${fit ? 'flex min-h-0 flex-col' : ''}`}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [s.key]: !isOpen })} className="w-full shrink-0 rounded-lg px-2 py-2 text-left hover:bg-surface-raised">
                <div className="flex items-baseline gap-2">
                  <span className={`shrink-0 text-[15px] font-medium ${s.st === 'pending' ? 'text-fg-muted' : ''}`}>{s.title}</span>
                  {!isOpen && <span data-hot={s.hot || undefined} className="min-w-0 flex-1 truncate rounded-md text-[13px] text-fg-muted data-[hot=true]:bg-surface-raised data-[hot=true]:text-fg">{s.summary}</span>}
                  <span aria-hidden className="ml-auto shrink-0 text-fg-muted">{isOpen ? '\u25be' : '\u25b8'}</span>
                </div>
              </button>
              {isOpen && <div className={`px-2 pb-3 pt-1 ${fit ? 'flex min-h-0 flex-col' : ''}`}>{s.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
