// src/resend.ts - FALLBACK ingestion mapping. Resend's webhook is metadata only; the body, headers and auth verdicts come from the Receiving API.
import { bodiesOf, parseAddr, sanitize } from './normalize';
import type { NormalizedEmail, Verdict } from './types';

/** Resend gives no reply-extraction, so cut quoted history ourselves (otherwise the OLD bank details in the thread look like "new" ones). */
export function stripQuoted(text: string): string {
  const lines = text.split('\n'); const cut = lines.findIndex((l, i) => /^On .{5,120}wrote:\s*$/i.test(l) || /^-{2,}\s*Original Message/i.test(l) || /^From:\s.+/i.test(l) && i > 0 && /^(Sent|Date):/i.test(lines[i + 1] ?? '') || /^>/.test(l));
  return (cut < 0 ? lines : lines.slice(0, cut)).join('\n').trim();
}
const map: Record<string, Verdict | undefined> = { pass: 'pass', fail: 'fail', gray: 'none' }; // 'gray' = none/softfail/neutral; processing_failed/unknown => undefined

export function normalizeResend(e: { id: string; message_id: string; from: string; to: string[]; reply_to?: string[]; subject?: string; text?: string | null; html?: string | null; headers?: Record<string, string>; created_at: string;
  authentication?: { spf?: string; dkim?: string; dmarc?: string } | null; attachments?: { filename?: string; content_type?: string; size?: number }[] }): NormalizedEmail {
  const { bodyFull, hidden, htmlOnly } = bodiesOf(e.text ?? undefined, e.html ?? undefined, undefined);
  const a = e.authentication;
  return { providerEventId: e.id, source: 'resend', messageId: e.message_id, inReplyTo: e.headers?.['in-reply-to'], receivedAt: e.created_at,
    from: parseAddr(e.from), replyTo: (e.reply_to ?? []).map(parseAddr), to: e.to.map((x) => parseAddr(x).address), subject: sanitize(e.subject ?? '').text,
    body: stripQuoted(bodyFull), bodyFull, hiddenChars: hidden, htmlOnly, attachments: (e.attachments ?? []).map((x) => ({ filename: x.filename, contentType: x.content_type, size: x.size ?? 0 })),
    auth: a ? { spf: map[a.spf ?? ''], dkim: map[a.dkim ?? ''], dmarc: map[a.dmarc ?? ''] } : null, unauthenticatedLabel: !!a && a.spf !== 'pass' && a.dkim !== 'pass' && a.dmarc !== 'pass' };
}
