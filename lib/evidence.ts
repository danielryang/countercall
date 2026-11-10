// lib/evidence.ts: which detector signals point at which part of the email, so a signal row and its highlighted evidence can light up together. Pure.
// Body evidence comes from each signal's own verified spans (offsets into the stored text). Header evidence is the sender's domain or the reply-to address.
import type { CaseView } from './reducer';

/** Signals whose evidence is the sender's domain (shown highlighted in the From line). */
export const SENDER_SIGNALS = new Set(['sender_domain_not_on_file', 'freemail_sender', 'display_name_impersonation', 'lookalike_domain', 'executive_impersonation']);
/** Signals whose evidence is the reply-to address. */
export const REPLY_SIGNALS = new Set(['reply_to_mismatch', 'reply_to_freemail']);

/** Signal ids that point at the body span [start, end). A span shared by two signals (routing number: "bank details present" and "differ") links to both. */
export function signalsForSpan(c: CaseView, start: number, end: number): string[] {
  return [...new Set(c.signals.filter((s) => s.spans.some((p) => p.start === start && p.end === end)).map((s) => s.id))];
}

/** Live model quotes can be whole sentences; only short ones read as evidence. Rule spans (exact matches) always show. */
export const MAX_MODEL_QUOTE = 40;
export const visibleSpan = (s: { start: number; end: number; source?: string }, len: number) =>
  s.start >= 0 && s.end <= len && s.start < s.end && (s.source !== 'llm' || s.end - s.start <= MAX_MODEL_QUOTE);

export interface EvidenceMap { from: string[]; replyTo: string[]; body: Set<string> }
/** Per place in the email, the signal ids that point there. A signal with no entry has nothing to point at (urgency read by the model, auth headers, ...). */
export function evidenceMap(c: CaseView): EvidenceMap {
  const ids = c.signals.map((s) => s.id as string);
  const len = c.email?.body.length ?? 0;
  return {
    from: ids.filter((i) => SENDER_SIGNALS.has(i)),
    replyTo: c.email?.replyTo.length ? ids.filter((i) => REPLY_SIGNALS.has(i)) : [],
    body: new Set(c.signals.filter((s) => s.spans.some((p) => visibleSpan(p, len))).map((s) => s.id)),
  };
}
/** Does this signal have something in the email to point at? */
export const hasEvidence = (m: EvidenceMap, id: string) => m.body.has(id) || m.from.includes(id) || m.replyTo.includes(id);
export const overlaps = (a: readonly string[], b: readonly string[] | null) => !!b && a.some((x) => b.includes(x));
