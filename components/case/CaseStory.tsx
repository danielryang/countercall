'use client';
// "What CounterCall did": the case's steps in plain language, as one timeline with ONE step open below it. The current step opens by itself and follows
// the case as it moves; a click opens any other step until the case moves on. A first-time viewer reads the timeline left to right and understands the
// product: flag the email (and freeze the payments at once), phone the vendor on the number we already had, show the result. The hold is a state, not a
// step: it lands within a second and lasts until a person releases the money, so it lives in step 1's status word and in the case details (held amount,
// since when, the invoices), not on the timeline. Presentational: the email pane, the details and the timing view arrive as nodes from the case detail.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { CallTranscript, answerTurn } from '@/components/call/CallPanel';
import { EVIDENCE_HINT, plainReasonGroups, REASONS, plainTask, REASON_TEXT, SOURCE_LABEL, STAMP } from '@/lib/copy';
import { evidenceMap, hasEvidence, overlaps } from '@/lib/evidence';
import type { CaseView } from '@/lib/reducer';
import { fmtCents, mmss } from '@/lib/selectors';

type Key = 'email' | 'hold' | 'call' | 'result' | 'release';
type St = 'done' | 'active' | 'pending' | 'warn';
interface Step { key: Key; name: string; title: string; st: St; body: ReactNode }
/** Reasons shown before the quiet "+N more" disclosure. */
const TOP_REASONS = 5;

/** 0..1: how far the rail has crept through the step in progress (fast, then slower; restarts at each new step). 0 under reduced motion. */
function useCreep(key: string | null): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    setP(0);
    if (!key || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    const id = window.setInterval(() => setP(1 - Math.exp(-(performance.now() - t0) / 7000)), 300);
    return () => window.clearInterval(id);
  }, [key]);
  return key ? p : 0;
}
const ST_TEXT: Record<St, string> = { done: 'done', active: 'in progress', warn: 'needs attention', pending: 'not yet' };

/** One plain sentence under the result, only where it adds something the headline does not. */
const RESULT_TEXT: Partial<Record<CaseView['state'], string>> = {
  fraud_blocked: 'A person can still release the payments to the account already on file.',
  awaiting_approval: 'Review and approve before any payment moves or the bank account changes.',
  needs_human: 'A task was created for your team. The payments stay on hold.',
};

export function CaseStory({ c, hot, onHot, email, timing, details, times }: {
  c: CaseView;
  /** when each step happened, in ms after the email arrived (null: not yet) */
  times?: Partial<Record<Key, number | null>>;
  /** the case details list (right column, every tab but the email) */
  details?: ReactNode;
  /** signal ids lit up by the email pane (or by a reason row here); the case detail owns this state */
  hot?: string[] | null; onHot?: (ids: string[] | null) => void;
  /** the email, shown inside step 1 next to the reasons */
  email?: ReactNode;
  /** the timing view, offered inside the result step */
  timing?: ReactNode;
}) {
  const [more, setMore] = useState(false);
  const hintId = useId();
  const v = c.vendorName ?? 'the vendor';
  const groups = plainReasonGroups(c);
  const ev = evidenceMap(c);
  const linkIds = (g: { ids: string[] }) => g.ids.filter((i) => hasEvidence(ev, i));
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
  const reasonsNode = (
        <div className="min-h-0 overflow-y-auto">
          <h3 className="pb-3 text-[18px] font-[500]">{groups.length ? 'Why it was flagged' : 'What was checked'}</h3>
          {groups.length ? (
            <ul className="space-y-1 text-[15px] leading-[22px]">
              {rows.map((g) => {
                const ids = linkIds(g);
                const live = ids.length > 0 && !!onHot;
                return (
                  <li key={g.text} className="flex gap-2.5 rounded-md px-1.5 py-0.5" {...(live ? {
                    tabIndex: 0, 'data-hot': overlaps(ids, hot ?? null) || undefined, 'aria-describedby': hintId,
                    onMouseEnter: () => onHot!(ids), onMouseLeave: () => onHot!(null), onFocus: () => onHot!(ids), onBlur: () => onHot!(null),
                  } : {})}>
                    <span aria-hidden className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-blocked" /><span>{g.text}</span>
                  </li>
                );
              })}
              {hidden.length > peek.length && (
                <li><button type="button" aria-expanded={false} onClick={() => setMore(true)} className="px-1 text-[13px] text-fg-muted underline hover:text-fg">{REASONS.more(hidden.length - peek.length)}</button></li>
              )}
              {more && groups.length > TOP_REASONS && (
                <li><button type="button" aria-expanded onClick={() => setMore(false)} className="px-1 text-[13px] text-fg-muted underline hover:text-fg">{REASONS.fewer}</button></li>
              )}
            </ul>
          ) : <p className="cap">{cleared ? 'No bank change was requested.' : 'Looking for signs of a fake request.'}</p>}
          {onHot && groups.some((g) => g.ids.some((i) => hasEvidence(ev, i))) ? <p id={hintId} className="cap mt-3">{EVIDENCE_HINT}</p> : null}
        </div>
  );
  const steps: Step[] = [];

  steps.push({
    key: 'email', name: 'Email', st: c.decision ? 'done' : 'active',
    title: cleared ? 'Looks normal' : !c.decision ? 'Reading it' : c.payments.length ? 'Flagged, payments held' : holding ? 'Flagged, holding payments' : 'Flagged',
    body: <div className="flex h-full min-h-0 flex-col">{email}</div>,
  });

  const openTask = c.tasks.find((t) => t.status === 'open');
  const skipped = !cleared && !c.call && c.state === 'needs_human' && !!openTask;   // the phone check never ran (calls off, unapproved sender, ...)
  // Every step is on the timeline from the first frame (never growing mid-story); a step that has not happened yet is muted.
  if (!cleared) steps.push({
    key: 'call', name: 'Phone call', st: o ? 'done' : c.call ? 'active' : skipped ? 'warn' : 'pending',
    title: skipped ? 'Did not run' : !c.call ? 'Waiting' : o ? 'Answered' : c.call.status === 'dialing' ? 'Ringing' : 'On the phone',
    body: (
      <div className="flex h-full min-h-0 flex-col gap-4">
        {skipped ? <p className="text-[15px]">{plainTask(openTask!.reason)}.</p> : (
          <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-[15px] text-fg-muted">Number on file</span>
            <span className="font-mono text-[22px] font-medium tabular-nums">{phone ?? 'looking it up…'}</span>
            {phone && <span className="text-[14px] text-fg-muted" title={ct?.sourceDoc ?? undefined}>from {ct ? `${SOURCE_LABEL[ct.source] ?? ct.source}, added ${ct.firstSeenAt.slice(0, 10)}` : 'the vendor record'}. <b className="font-[600] text-fg">Never</b> a number from the email.</span>}
          </div>
        )}
        {c.call && <CallTranscript c={c} />}
      </div>
    ),
  });

  const resultWord = o ? STAMP[o.decision.outcome].word : cleared ? 'Nothing to do' : c.state === 'needs_human' ? 'Needs a person' : 'Waiting';
  steps.push({
    key: 'result', name: 'Result', st: o || cleared ? (c.state === 'needs_human' ? 'warn' : 'done') : c.state === 'needs_human' ? 'warn' : 'pending',
    title: o || cleared || c.state === 'needs_human' ? resultWord : 'Waiting',
    body: (
      <div className="max-w-[720px] space-y-4">
        {ans && (
          <figure>
            <figcaption className="text-[14px] text-fg-muted">{v} said on the call</figcaption>
            <blockquote className="mt-1 text-[26px] font-[500] leading-9 tracking-[-0.01em]"><span className="ev" data-verdict={c.state === 'fraud_blocked' ? 'no' : c.state === 'awaiting_approval' ? 'yes' : undefined}>{'“'}{ans.trim()}{'”'}</span></blockquote>
          </figure>
        )}
        {(o || RESULT_TEXT[c.state]) && <p className="text-[15px] leading-6">{o ? `${REASON_TEXT[o.decision.reason].rule}. ` : ''}{RESULT_TEXT[c.state] ?? ''}</p>}
        {timing}
      </div>
    ),
  });

  if (c.release) steps.push({
    key: 'release', name: 'Release', st: 'done', title: `By ${c.release.approvedBy}`,
    body: (
      <div className="max-w-[640px] space-y-2 text-[15px] leading-6">
        <p>{fmtCents(cents)} was released to {c.release.destination === 'on_file' ? 'the account we already had on file' : 'the new bank account, pending Ramp’s own approval'}.</p>
        {c.release.note && <p className="text-fg-muted">Reason given: {c.release.note}</p>}
        <p className="cap">Approved by a person, recorded in the audit log.</p>
      </div>
    ),
  });

  // the latest step that needs attention opens by itself; a click opens another step until the case moves on
  // While the hold is still being applied there is nothing to show under it yet, so the email (with its evidence drawing in) stays open.
  const attention = [...steps].reverse().find((s) => s.st === 'active' || s.st === 'warn');
  const lastDone = [...steps].reverse().find((s) => s.st !== 'pending');
  const current = attention?.key ?? lastDone?.key ?? 'email';
  const [pick, setPick] = useState<{ key: Key; at: Key } | null>(null);
  useEffect(() => { setPick(null); }, [c.id]);
  const open = pick && pick.at === current && steps.some((s) => s.key === pick.key) ? pick.key : current;
  const panel = steps.find((s) => s.key === open)!;
  const n = steps.length;
  const cols = `repeat(${n}, minmax(0, 1fr))`;
  const finished = steps.every((s) => s.st === 'done');
  // where the case is: the last step in progress or needing a person, else the step after the last finished one
  let at = -1; for (let i = n - 1; i >= 0 && at < 0; i--) if (steps[i].st === 'active' || steps[i].st === 'warn') at = i;
  let doneIdx = -1; for (let i = n - 1; i >= 0 && doneIdx < 0; i--) if (steps[i].st === 'done') doneIdx = i;
  const idx = at >= 0 ? at : doneIdx + 1;
  const live = at >= 0 && steps[at].st === 'active';
  const onCall = live && steps[idx].key === 'call';
  const creep = useCreep(live && !onCall ? `${c.id}:${steps[idx].key}` : null);
  // The phone call moves with the call itself, never a clock: just inside the step while it rings, then one notch for every line spoken (each question
  // the agent asks and each answer), up to 90% until the outcome lands. A step that lasts seconds (reading the email) creeps on a clock instead.
  const spoken = c.call?.turns.filter((t) => t.text.trim()).length ?? 0;
  const callFrac = !c.call || (c.call.status === 'dialing' && spoken === 0) ? 0.06 : Math.min(0.9, 0.16 + 0.1 * spoken);
  // the end when finished; on the call, where the conversation is; creeping through another step in progress; mid-step when a step needs a person;
  // at the next step's start between steps
  const pos = finished ? 100 : onCall ? ((idx + callFrac) / n) * 100 : live ? ((idx + 0.06 + 0.84 * creep) / n) * 100 : at >= 0 ? ((idx + 0.5) / n) * 100 : (idx / n) * 100;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The sequence as one timeline: labels above, one continuous rail, the time each step happened below. The rail is solid black up to where
          the case is and soft grey after it; the case's position is marked by the same black tick as the step checkpoints. When the case moves on,
          the black line and its tick glide to the next step (state change: the case advanced); while a step is in progress they creep forward
          through it: on the phone call one notch per line spoken, on a short step on a clock (state change: CounterCall is working on this step).
          Finished: all black, no tick. */}
      <div className="shrink-0">
        <div role="tablist" aria-label="What CounterCall did, step by step" className="grid" style={{ gridTemplateColumns: cols }}>
          {steps.map((s, i) => {
            const sel = s.key === open;
            return (
              <button key={s.key} type="button" role="tab" id={`step-${s.key}`} aria-selected={sel} aria-controls="step-panel" onClick={() => setPick({ key: s.key, at: current })} className="min-w-0 pr-4 text-left">
                <span className={`-ml-2 block rounded-sm px-2 py-1 transition-colors duration-[var(--d-fast)] ${sel ? 'bg-surface-raised' : 'hover:bg-surface-raised/50'}`}>
                  <span className="flex items-baseline gap-2 text-[13px] leading-5 text-fg-muted"><span>Step {i + 1}</span>{s.st === 'active' && <span className="font-[600] text-fg">Now</span>}</span>
                  <span className={`block truncate text-[16px] leading-6 ${s.st === 'pending' ? 'text-fg-muted' : 'font-[550] text-fg'}`}>{s.name}</span>
                  <span className={`block truncate text-[14px] leading-5 ${s.st === 'warn' ? 'text-banner-ink' : 'text-fg-muted'}`}>{s.title}</span>
                </span>
                <span className="sr-only"> ({ST_TEXT[s.st]})</span>
              </button>
            );
          })}
        </div>
        <div aria-hidden className="relative mt-3 h-[3px] rounded-full bg-rule-strong">
          {steps.map((s, i) => <i key={s.key} className={`absolute -top-[5px] h-[13px] w-[2px] transition-colors duration-[var(--d-slow)] ${finished || i <= idx ? 'bg-fg' : 'bg-rule-strong'}`} style={{ left: `${(i / n) * 100}%` }} />)}
          <span className="absolute inset-y-0 left-0 transition-[width] duration-[var(--d-slow)] ease-[var(--ease-out)]" style={{ width: `${pos}%` }}>
            <i className="absolute inset-0 rounded-full bg-fg" />
            {!finished && <i className="absolute -right-px -top-[5px] h-[13px] w-[2px] bg-fg" />}
          </span>
        </div>
        <div aria-hidden className="mt-2 grid font-mono text-[13px] text-fg-muted" style={{ gridTemplateColumns: cols }}>
          {steps.map((s) => { const t = times?.[s.key] ?? null; return <span key={s.key}>{t !== null ? mmss(t) : s.st === 'active' ? 'now' : '\u00a0'}</span>; })}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-10 pt-5">
        <div id="step-panel" role="tabpanel" aria-labelledby={`step-${panel.key}`} className="flex min-h-0 flex-col overflow-y-auto">{panel.body}</div>
        <aside className="min-h-0 overflow-y-auto">{open === 'email' ? reasonsNode : details}</aside>
      </div>
    </div>
  );
}
