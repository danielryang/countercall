// src/policy.ts - THE decision. Pure function: (signals + extraction + vendor) -> risk, reasons, actions.
// The LLM can only ADD a reason to act (OR-ed with the deterministic triggers). It can never suppress one, and nothing it says releases money.
import type { Action, Category, Decision, Extraction, Facts, Reason, Risk, Signal, SignalId, Vendor, VendorMatch } from './types';

const POINTS = { info: 0, low: 1, medium: 2, high: 3, critical: 5 } as const;
// These define WHAT the email is asking for, not how fraudulent it looks, so they do not feed the fraud score.
const CHANGE_DEFINING = new Set<SignalId>(['bank_details_present', 'bank_details_differ', 'bank_details_match_on_file', 'bank_change_language', 'attachment_may_hold_details']);
// Any of these on a bank-change email means "this is almost certainly fraud": floor the risk at critical.
const CRITICAL_FLOOR = new Set<SignalId>(['auth_dmarc_fail', 'auth_unauthenticated', 'lookalike_domain', 'executive_impersonation', 'injection_markers', 'freemail_sender', 'reply_to_mismatch', 'secrecy_no_callback']);
const LEVELS: Risk[] = ['none', 'low', 'medium', 'high', 'critical'];
const levelOf = (score: number): Risk => (score >= 8 ? 'critical' : score >= 5 ? 'high' : score >= 3 ? 'medium' : score >= 1 ? 'low' : 'none');
const maxRisk = (a: Risk, b: Risk): Risk => (LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b);

export interface DecideInput {
  signals: Signal[];
  facts: Facts;
  extraction: Extraction | null;     // null = LLM unavailable / refused / invalid -> degrade to deterministic-only, fail closed
  vendorMatch: VendorMatch | null;
  llmEvidenceDropped?: number;       // quotes the model returned that are not substrings of the email (hallucinated or injected)
}

export function decide({ signals, facts, extraction: x, vendorMatch, llmEvidenceDropped = 0 }: DecideInput): Decision {
  const has = (id: SignalId) => signals.some((s) => s.id === id);
  const vendor: Vendor | null = vendorMatch?.vendor ?? null;
  const reasons: Reason[] = [];
  const why = (code: string, text: string) => reasons.push({ code, text });

  // ---- 1. is it a payment-instruction change? deterministic OR llm (fail closed) ----
  const detBank = has('bank_details_differ') || has('bank_change_language') || has('attachment_may_hold_details') || (!vendor && has('bank_details_present'));
  const llmBank = x?.is_payment_instruction_change === true;
  const bankChange = detBank || llmBank;
  if (bankChange) {
    if (has('bank_details_differ')) why('BANK_DETAILS_DIFFER', signals.find((s) => s.id === 'bank_details_differ')!.detail);
    if (has('bank_change_language')) why('BANK_CHANGE_WORDING', 'Email uses payment-instruction-change wording.');
    if (has('attachment_may_hold_details')) why('DETAILS_IN_ATTACHMENT', 'Change is referenced but the details sit in an attachment we cannot verify.');
    if (llmBank && !detBank) why('LLM_BANK_CHANGE', `Classifier: ${x!.summary}`);
    if (detBank && x && !llmBank) why('LLM_DISAGREES', 'Classifier said "no change" but deterministic checks found one. Deterministic wins.');
  }

  // ---- 2. fraud score (excludes change-defining signals) ----
  let score = 0;
  for (const s of signals) if (!CHANGE_DEFINING.has(s.id)) { score += POINTS[s.severity]; if (s.severity !== 'info') why(s.id.toUpperCase(), s.detail); }
  if (x?.contains_instructions_to_ai && !has('injection_markers')) { score += POINTS.high; why('LLM_SAW_INJECTION', 'Classifier reports text aimed at an AI system.'); }
  if (x?.pressure_not_to_call && !has('secrecy_no_callback')) { score += POINTS.high; why('LLM_NO_CALL_PRESSURE', 'Classifier reports pressure not to verify by phone.'); }
  if (llmEvidenceDropped > 0) { score += POINTS.medium; why('EVIDENCE_NOT_IN_EMAIL', `${llmEvidenceDropped} classifier quote(s) are not in the email text; treating the output as unreliable.`); }
  let risk = levelOf(score);
  if (bankChange) {
    risk = maxRisk(risk, 'medium'); // a payment-instruction change is never "low risk"
    if (signals.some((s) => CRITICAL_FLOOR.has(s.id) && s.severity !== 'low' && s.severity !== 'info') || x?.contains_instructions_to_ai) risk = 'critical';
  }

  // ---- 3. category ----
  const category: Category = bankChange ? 'bank_change'
    : has('executive_impersonation') ? 'executive_impersonation'
    : has('injection_markers') || x?.contains_instructions_to_ai ? 'prompt_injection_attempt'
    : x?.category ?? 'unclassified';

  // ---- 4. actions (money-moving actions only for a vendor we can resolve AND have a trusted number for) ----
  const actions: Action[] = [];
  if (bankChange && vendor) {
    actions.push({ type: 'HOLD_VENDOR_PAYMENTS', vendorId: vendor.id, paymentIds: vendor.scheduledPaymentIds });
    if (vendor.trustedPhone) actions.push({ type: 'START_CALLBACK', vendorId: vendor.id, phone: vendor.trustedPhone }); // never facts.phones, never LLM output
    else actions.push({ type: 'CREATE_HUMAN_TASK', reason: `No trusted phone on file for ${vendor.name}; verify via a known contact.` });
    if (risk === 'high' || risk === 'critical') actions.push({ type: 'FLAG_PHISHING' });
  } else if (bankChange) {
    actions.push({ type: 'CREATE_HUMAN_TASK', reason: 'Payment-instruction change from a sender we cannot match to any vendor. Nothing to hold or dial.' }, { type: 'FLAG_PHISHING' });
  } else if (category === 'executive_impersonation' || category === 'gift_card_scam' || category === 'urgent_wire_request' || category === 'prompt_injection_attempt') {
    actions.push({ type: 'CREATE_HUMAN_TASK', reason: `${category.replace(/_/g, ' ')}: no vendor involved, human review.` }, { type: 'FLAG_PHISHING' });
    risk = maxRisk(risk, 'high');
  } else if (risk === 'high' || risk === 'critical') {
    actions.push({ type: 'CREATE_HUMAN_TASK', reason: 'No payment-instruction change detected, but the sender looks untrustworthy (see reasons).' }, { type: 'FLAG_PHISHING' });
  } else if (has('amount_outlier') || has('amount_mismatch_invoice')) {
    actions.push({ type: 'CREATE_HUMAN_TASK', reason: 'Invoice amount is out of pattern for this vendor.' });
    risk = maxRisk(risk, 'medium');
  } else if (!x && vendor) {
    actions.push({ type: 'CREATE_HUMAN_TASK', reason: 'Classifier unavailable; vendor email left unreviewed would be fail-open.' });
    why('CLASSIFIER_UNAVAILABLE', 'LLM did not return a usable result.');
  } // else PASS: no actions

  if (!actions.length) why('NO_ACTION', 'No payment-instruction change and no money-moving request detected.');
  return { category, bankChange, risk, score, reasons: dedupe(reasons), actions, vendorId: vendor?.id ?? null, llmStatus: x ? 'ok' : 'unavailable' };
}

const dedupe = (r: Reason[]) => r.filter((x, i) => r.findIndex((y) => y.code === x.code) === i);

// ---------------------------------------------------------------------------------------------
// After the call. The voice agent (01) returns a structured outcome; THIS function decides what it means.
// Only a fully-verified confirmation proceeds, and even then a human approves the bank-detail update (maker-checker).
export interface CallOutcome {
  status: 'confirmed' | 'denied' | 'no_answer' | 'voicemail' | 'ambiguous' | 'wrong_party' | 'failed';
  dialedNumber: string;
  challenge?: { accountLast4Matches: boolean; invoiceMatches: boolean };
}
export interface PostCall { hold: 'KEEP_HOLD' | 'RELEASE_AFTER_HUMAN_APPROVAL'; bankDetails: 'REJECT' | 'APPLY_AFTER_HUMAN_APPROVAL' | 'UNCHANGED'; flagFraud: boolean; humanTask?: string }

export function postCallDecision(c: CallOutcome, vendor: Vendor): PostCall {
  if (c.dialedNumber !== vendor.trustedPhone) return { hold: 'KEEP_HOLD', bankDetails: 'UNCHANGED', flagFraud: false, humanTask: 'INVARIANT BROKEN: call went to a number that is not the on-file number.' };
  if (c.status === 'denied') return { hold: 'KEEP_HOLD', bankDetails: 'REJECT', flagFraud: true };
  if (c.status === 'confirmed' && c.challenge?.accountLast4Matches && c.challenge.invoiceMatches) return { hold: 'RELEASE_AFTER_HUMAN_APPROVAL', bankDetails: 'APPLY_AFTER_HUMAN_APPROVAL', flagFraud: false };
  return { hold: 'KEEP_HOLD', bankDetails: 'UNCHANGED', flagFraud: false, humanTask: `Call outcome "${c.status}" is not a verified confirmation; a human must resolve it.` }; // fail closed
}
