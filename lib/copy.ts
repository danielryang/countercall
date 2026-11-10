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
  sender_domain_not_on_file: 'Domain', freemail_sender: 'Freemail', sender_not_known_contact: 'Sender', display_name_impersonation: 'Display name',
  lookalike_domain: 'Lookalike', reply_to_mismatch: 'Reply-To', reply_to_freemail: 'Reply-To', executive_impersonation: 'Executive',
  auth_dmarc_fail: 'DMARC', auth_spf_fail: 'SPF', auth_dkim_fail: 'DKIM', auth_unauthenticated: 'Auth', auth_unknown: 'Auth',
  bank_details_present: 'Bank details', bank_details_differ: 'Bank diff', bank_details_match_on_file: 'Bank match', routing_checksum_invalid: 'Routing',
  bank_change_language: 'Wording', urgency_language: 'Urgency', secrecy_no_callback: 'Secrecy', injection_markers: 'AI injection', phone_in_email: 'Phone',
  attachment_may_hold_details: 'Attachment', amount_outlier: 'Amount', amount_mismatch_invoice: 'Invoice', hidden_text: 'Hidden text',
};
