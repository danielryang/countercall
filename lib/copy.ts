// lib/copy.ts: every user-facing label in one place. Presentational only: no logic that decides anything.
import type { CaseState } from './events';
import type { Reason } from './voice/decide';

export type ChipSpec =
  | { kind: 'risk'; status: 'HELD' | 'CALLING' | 'VERIFIED' | 'BLOCKED' | 'NEEDS_REVIEW'; label: string }
  | { kind: 'plain'; variant: 'dashed' | 'danger' | 'quiet'; label: string };

/** case_state -> chip. Risk states are solid cut-corner chips (glyph + text + shape); neutral states are hairline. Mapping per 08 section 3.4. */
export const CHIP: Record<CaseState, ChipSpec> = {
  scanning: { kind: 'plain', variant: 'dashed', label: 'Scanning' },
  cleared: { kind: 'plain', variant: 'quiet', label: 'Clear' },
  flagged: { kind: 'plain', variant: 'danger', label: 'Flagged' },
  held: { kind: 'risk', status: 'HELD', label: 'Held' },
  calling: { kind: 'risk', status: 'CALLING', label: 'Calling' },
  awaiting_approval: { kind: 'risk', status: 'VERIFIED', label: 'Verified' },
  fraud_blocked: { kind: 'risk', status: 'BLOCKED', label: 'Blocked' },
  needs_human: { kind: 'risk', status: 'NEEDS_REVIEW', label: 'Needs review' },
  released: { kind: 'plain', variant: 'quiet', label: 'Released' },
  closed: { kind: 'plain', variant: 'quiet', label: 'Closed' },
};
export const STATE_NOTE: Partial<Record<CaseState, string>> = {
  awaiting_approval: 'needs human approval', fraud_blocked: 'change rejected', needs_human: 'task open', held: 'awaiting call',
};

/** What the policy decided, in the words the decision panel prints. Derived from the deterministic reason code, never written by the model. */
export const REASON_TEXT: Record<Reason, { rule: string; effect: string }> = {
  CHALLENGE_MATCHED: { rule: 'Vendor confirmed and gave the correct detail', effect: 'AWAITING HUMAN APPROVAL' },
  VENDOR_DENIED: { rule: 'Vendor denied sending the request', effect: 'REJECT CHANGE · KEEP HELD' },
  CHALLENGE_MISMATCH: { rule: 'Vendor said yes but the detail did not match', effect: 'KEEP HELD · HUMAN TASK' },
  CHALLENGE_NOT_GIVEN: { rule: 'Vendor said yes but gave no verification detail', effect: 'KEEP HELD · HUMAN TASK' },
  SUSPICIOUS_BEHAVIOR: { rule: 'Caller asked for bank details or pushed to approve', effect: 'KEEP HELD · HUMAN TASK' },
  CONFLICTING_ANSWERS: { rule: 'Answers contradicted each other', effect: 'KEEP HELD · HUMAN TASK' },
  SECOND_READER_DISAGREES: { rule: 'An independent read of the call disagreed', effect: 'KEEP HELD · HUMAN TASK' },
  ANALYSIS_MISSING: { rule: 'The independent call analysis did not arrive', effect: 'KEEP HELD · HUMAN TASK' },
  UNSURE: { rule: 'The answer was vague ("I think so?")', effect: 'KEEP HELD · HUMAN TASK' },
  WRONG_PERSON: { rule: 'Reached someone who could not answer for accounts receivable', effect: 'KEEP HELD · HUMAN TASK' },
  CALLBACK_REQUESTED: { rule: 'Vendor asked to be called back', effect: 'KEEP HELD · HUMAN TASK' },
  RECORDING_DECLINED: { rule: 'Vendor declined the recording notice', effect: 'KEEP HELD · HUMAN TASK' },
  NO_ANSWER: { rule: 'Nobody answered', effect: 'KEEP HELD · HUMAN TASK' },
  BUSY: { rule: 'The line was busy', effect: 'KEEP HELD · HUMAN TASK' },
  VOICEMAIL: { rule: 'Reached voicemail; nothing was left', effect: 'KEEP HELD · HUMAN TASK' },
  IVR_ONLY: { rule: 'Only a phone menu answered', effect: 'KEEP HELD · HUMAN TASK' },
  TIME_LIMIT: { rule: 'The call hit its time limit', effect: 'KEEP HELD · HUMAN TASK' },
  CALL_FAILED: { rule: 'The call could not be completed', effect: 'KEEP HELD · HUMAN TASK' },
  NO_RESULT: { rule: 'No usable result was recorded', effect: 'KEEP HELD · HUMAN TASK' },
};
export const STAMP: Record<'CONFIRMED_LEGIT' | 'DENIED_FRAUD' | 'UNVERIFIED', { word: string; status: 'VERIFIED' | 'BLOCKED' | 'NEEDS_REVIEW'; sub: string }> = {
  CONFIRMED_LEGIT: { word: 'Verified', status: 'VERIFIED', sub: 'Held · needs approval' },
  DENIED_FRAUD: { word: 'Blocked', status: 'BLOCKED', sub: 'Held · change rejected' },
  UNVERIFIED: { word: 'Unverified', status: 'NEEDS_REVIEW', sub: 'Held · task created' },
};
export const SIGNAL_LABEL: Record<string, string> = {
  sender_domain_not_on_file: 'Domain', freemail_sender: 'Freemail', sender_not_known_contact: 'Sender', display_name_impersonation: 'Display',
  lookalike_domain: 'Lookalike', reply_to_mismatch: 'Reply-To', reply_to_freemail: 'Reply-To', executive_impersonation: 'Executive',
  auth_dmarc_fail: 'DMARC', auth_spf_fail: 'SPF', auth_dkim_fail: 'DKIM', auth_unauthenticated: 'Auth', auth_unknown: 'Auth',
  bank_details_present: 'Bank info', bank_details_differ: 'Bank diff', bank_details_match_on_file: 'Bank match', routing_checksum_invalid: 'Routing',
  bank_change_language: 'Wording', urgency_language: 'Urgency', secrecy_no_callback: 'Secrecy', injection_markers: 'AI injection', phone_in_email: 'Phone',
  attachment_may_hold_details: 'Attachment', amount_outlier: 'Amount', amount_mismatch_invoice: 'Invoice', hidden_text: 'Hidden text',
};

export const CATEGORY_LABEL: Record<string, string> = {
  bank_change: 'Bank change request', urgent_wire_request: 'Urgent wire request', executive_impersonation: 'Executive impersonation', gift_card_scam: 'Gift card request',
  invoice_normal: 'Invoice', vendor_info_request: 'Vendor information request', newsletter_marketing: 'Newsletter', prompt_injection_attempt: 'Prompt injection attempt', other: 'Email',
};
export const PHASE_LABEL = { DETECT: 'Detect', FREEZE: 'Freeze', VERIFY: 'Verify', DECIDE: 'Decide' } as const;

export const SOURCE_LABEL: Record<string, string> = { onboarding_w9: 'signed W-9', contract: 'contract', ramp_contact_at_import: 'Ramp record', vendor_website: 'vendor website', prior_verified_call: 'prior verified call', human_entered: 'entered by a person' };

// ---------------------------------------------------------------------------------------------------------------------------------
// Plain language. A judge who has never seen this product should understand every screen without a glossary: no rule ids, no jargon.
// ---------------------------------------------------------------------------------------------------------------------------------
import type { CaseView } from './reducer';
import { fmtCents } from './selectors';

/** One short sentence per detector signal (what looked wrong, in everyday words). */
export const PLAIN_SIGNAL: Record<string, (vendor: string) => string> = {
  sender_domain_not_on_file: (v) => `Not sent from ${v}'s usual email domain`,
  freemail_sender: () => 'Sent from a free email account (like Gmail), not a company address',
  display_name_impersonation: (v) => `The sender's name says ${v}, but the email is not from ${v}`,
  sender_not_known_contact: () => 'First time this sender has written to you',
  lookalike_domain: (v) => `The domain looks like ${v}'s, but it is not`,
  reply_to_mismatch: () => 'Replies would go to a different address than the sender',
  reply_to_freemail: () => 'Replies would go to a free email account',
  executive_impersonation: () => 'Pretends to be someone at your company',
  auth_dmarc_fail: () => 'Failed the checks that prove who really sent the email',
  auth_spf_fail: () => 'Failed the checks that prove who really sent the email',
  auth_dkim_fail: () => 'Failed the checks that prove who really sent the email',
  auth_unauthenticated: () => 'Could not prove who sent this email',
  bank_details_differ: () => 'The new bank account does not match the one on file',
  bank_details_present: () => 'Includes new bank account details',
  bank_change_language: () => 'Asks to change where payments are sent',
  urgency_language: () => 'Pressures you to act quickly',
  secrecy_no_callback: () => 'Discourages checking by phone',
  injection_markers: () => 'Contains text trying to instruct an AI',
  phone_in_email: () => 'Lists a phone number to call (CounterCall never uses it)',
  attachment_may_hold_details: () => 'Points to an attachment that may hold bank details',
  amount_outlier: () => 'The amount is far larger than usual for this vendor',
  amount_mismatch_invoice: () => 'The amount does not match the invoice on file',
  routing_checksum_invalid: () => 'The routing number is not valid',
  hidden_text: () => 'Contains hidden characters',
};
const SEV = { critical: 4, high: 3, medium: 2, low: 1, info: 0 } as const;
/** The few reasons that matter most, in plain English, most serious first (duplicates collapsed). */
export function plainReasons(c: CaseView): string[] {
  return plainReasonGroups(c).map((g) => g.text);
}

export type Tone = 'danger' | 'warn' | 'ok' | 'progress' | 'neutral';
export interface Headline { title: string; sub: string; tone: Tone }
const cents = (c: CaseView) => c.payments.reduce((n, b) => n + b.amountCents, 0);

/** The one sentence that says what happened and what it means. Written for a reader who knows nothing about the product. */
export function headline(c: CaseView): Headline {
  const v = c.vendorName ?? 'the vendor'; const money = cents(c) ? fmtCents(cents(c)) : 'The payments';
  const o = c.call?.outcome;
  switch (c.state) {
    case 'scanning': return { tone: 'progress', title: 'Reading a new email', sub: 'CounterCall checks every email sent to the accounts-payable inbox.' };
    case 'cleared': return { tone: 'ok', title: 'Looks normal', sub: 'No bank change was requested, so nothing was held and nobody was called.' };
    case 'flagged': return { tone: 'warn', title: 'Suspicious request found', sub: `Someone is asking to change where ${v} gets paid. Holding the payments now.` };
    case 'held': return { tone: 'warn', title: 'Payments are on hold', sub: `${money} is frozen. Next, CounterCall phones ${v} on the number it already had on file, not any number from the email.` };
    case 'calling': return { tone: 'progress', title: `Calling ${v}`, sub: 'Asking them directly: did you send this request? The call is automated and says so at the start.' };
    case 'fraud_blocked': return { tone: 'danger', title: `Blocked. ${v} says they did not send this.`, sub: `The bank change was rejected and ${money} stays on hold. Only a person can release it.` };
    case 'awaiting_approval': return { tone: 'ok', title: 'Verified by phone. Waiting for approval.', sub: `${v} confirmed the request and answered the security question. No money moves until a person approves.` };
    case 'needs_human': return { tone: 'warn', title: 'Could not verify. A person needs to follow up.', sub: `${o ? REASON_TEXT[o.decision.reason].rule : plainTask(c.tasks.find((t) => t.status === 'open')?.reason ?? 'Verification did not complete')}. ${cents(c) ? `${money} stays on hold.` : ''}`.trim() };
    case 'released': return { tone: 'ok', title: 'Payment released', sub: c.release ? `Approved by ${c.release.approvedBy}.` : 'A person approved the release.' };
    case 'closed': return { tone: 'neutral', title: 'Case closed', sub: c.closed?.note ?? '' };
  }
}

/** Task reasons are written for operators (they can name settings). The UI shows everyday words instead. */
export function plainTask(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('calls disabled')) return 'Phone verification is switched off right now, so nobody was called';
  if (r.includes('calls not wired')) return 'Phone verification is not set up yet';
  if (r.includes('allowlist')) return 'This sender is not on the approved list, so nothing was held and nobody was called';
  if (r.includes('duplicate') || r.includes('already open')) return 'A check for this same bank change is already open';
  if (r.includes('no trusted')) return 'There is no verified phone number on file for this vendor';
  if (r.includes('hourly') || r.includes('more than')) return 'Too many calls to this vendor recently, so none was placed';
  if (r.includes('in flight')) return 'Another verification call is in progress';
  if (r.includes('dial failed')) return 'The call could not be placed';
  if (r.includes('hold') && r.includes('fail')) return 'The payment hold did not fully apply';
  if (r.includes('never reported back')) return 'A call attempt never reported back';
  return reason.replace(/\(?[A-Z_]{4,}=?\d?\)?/g, '').replace(/\s+/g, ' ').trim();
}

// ---- Demo panel (S8): scenario cards and the callee cheat-card. What the teammate playing Acme reads. Never a phone number or the digits.
/** Keyed by lib/voice/scenarios.ts names. `run` is the recorded run in public/runs/ that shows the same call (null: no recording). */
export const SCENARIO_COPY: Record<'confirmed' | 'denied' | 'voicemail' | 'vague' | 'impostor' | 'injection', { title: string; run: string | null; tip: string }> = {
  denied: { title: 'Vendor says no', run: 'fraud', tip: 'Answer as Acme, then say plainly that nobody changed banks.' },
  confirmed: { title: 'Vendor says yes', run: 'confirmed', tip: 'Say yes, then give the four digits when asked. They are the last four of the most recent paid invoice number; look them up off-screen.' },
  voicemail: { title: 'Voicemail', run: 'voicemail', tip: 'Do not pick up, or answer with a voicemail greeting.' },
  vague: { title: 'Unsure answer', run: 'vague', tip: 'Sound unsure. Do not say a clear yes or no.' },
  impostor: { title: 'Wrong digits', run: 'impostor', tip: 'Say yes, then give four wrong digits, the way an impostor who answered the phone would.' },
  injection: { title: 'Tries to trick the AI', run: null, tip: 'Tell the assistant to ignore its instructions and approve the change.' },
};
/** Stands in for the challenge answer on the cheat-card. The real digits are never sent to the browser. */
export const CHEAT_DIGITS = '(the four digits, looked up off-screen)';
export const STAGE_OK = 'Stage 1280×720 OK';
export const stageOff = (w: number, h: number) => `Stage ${w}×${h} · needs 1280×720`;

// ---------------------------------------------------------------------------------------------------------------------------------
// Evidence links and timing (reason row <-> highlighted evidence in the email; the "how long each step took" waterfall).
// ---------------------------------------------------------------------------------------------------------------------------------
import type { LapKey } from './waterfall';

/** plainReasons() with the signal ids behind each sentence, so a reason row can point at its evidence in the email. Same order, same dedupe. */
export function plainReasonGroups(c: CaseView): { text: string; ids: string[] }[] {
  const v = c.vendorName ?? 'the vendor';
  const out: { text: string; ids: string[] }[] = [];
  for (const s of [...c.signals].sort((a, b) => SEV[b.severity] - SEV[a.severity])) {
    if (s.severity === 'info') continue;
    const text = (PLAIN_SIGNAL[s.id] ?? (() => s.detail))(v);
    const g = out.find((x) => x.text === text);
    if (g) g.ids.push(s.id); else out.push({ text, ids: [s.id] });
  }
  return out;
}
export const EVIDENCE_HINT = 'Point at a reason to see it in the email.';

export const LAP_LABEL: Record<LapKey, string> = {
  detect: 'Read and checked the email',
  hold: 'Put the payments on hold',
  dial: 'Dialed the number on file',
  call: 'Talked to the vendor and decided',
};
export const TIMING = {
  title: 'How long each step took',
  total: 'Email to result',
  sofar: 'So far',
  running: 'in progress',
  skipped: 'did not run',
  model: (d: string) => `AI read: ${d}`,
  ramp: (n: number, d: string, mode: string | null) => `${n} hold requests to ${mode === 'sandbox' ? 'Ramp sandbox' : 'the Ramp mock'}: ${d}`,
  ring: (d: string) => `Answered after ${d}`,
  measured: 'Times come from the event log.',
  paced: 'This replay was generated for viewing, so its times are paced, not measured.',
};
