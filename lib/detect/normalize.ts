// src/normalize.ts - provider payload -> NormalizedEmail. Sanitizes untrusted text once, so regexes, the LLM and the UI all see the SAME string.
import { convert } from 'html-to-text';
import type { Addr, AuthResults, NormalizedEmail, Verdict } from './types';

// soft hyphen, zero-width, bidi controls, word joiners, BOM, and Unicode "tag" characters (U+E0000-E007F, used for invisible prompt smuggling)
const INVISIBLE = /[­​-‏‪-‮⁠-⁤⁦-⁩﻿\u{E0000}-\u{E007F}]/gu;

export function sanitize(raw: string): { text: string; hidden: number } {
  let hidden = 0;
  const text = raw.normalize('NFKC').replace(/\r\n?/g, '\n').replace(INVISIBLE, () => (hidden++, '')); // NFKC also folds full-width digits (０２１...) to ASCII
  return { text, hidden };
}

export function parseAddr(s: string): Addr {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || undefined, address: m[2].trim().toLowerCase() } : { address: s.trim().toLowerCase() };
}
const asArray = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// ---- AgentMail (REST/webhook JSON is snake_case; the TS SDK 0.5.46 types do NOT include authentication_results, so we use raw JSON) ----
export interface AgentMailMessage {
  inbox_id: string; message_id: string; thread_id?: string;
  from?: string | string[]; from_?: string | string[];   // docs show both spellings; handle either
  reply_to?: string[]; to?: string[]; subject?: string;
  text?: string; html?: string; extracted_text?: string; extracted_html?: string;
  attachments?: { filename?: string; content_type?: string; size?: number }[];
  in_reply_to?: string; timestamp?: string; labels?: string[];
  authentication_results?: Record<string, string>;
  agent_armor?: { status?: string; verdict?: string };
  body_url?: string;                                     // present instead of text/html when body > 64 KiB
}

export async function fetchAgentMailMessage(inboxId: string, messageId: string): Promise<AgentMailMessage> {
  const r = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`, {
    headers: { Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}` },
  });
  if (!r.ok) throw new Error(`AgentMail get message failed: ${r.status}`);
  return r.json() as Promise<AgentMailMessage>;
}

const V: Verdict[] = ['pass', 'fail', 'none', 'neutral', 'softfail', 'temperror', 'permerror'];
const verdict = (v?: string): Verdict | undefined => (V.includes(v as Verdict) ? (v as Verdict) : undefined);

export function authFromAgentMail(a?: Record<string, string>): AuthResults | null {
  if (!a || !Object.keys(a).length) return null; // absent or {} => unknown. Never default to "pass".
  return { spf: verdict(a.spf), dkim: verdict(a.dkim), dmarc: verdict(a.dmarc), spfDomain: a.spf_domain, dkimDomain: a.dkim_domain, dmarcDomain: a.dmarc_domain, arcSealer: a.arc_sealer };
}

export function bodiesOf(text: string | undefined, html: string | undefined, extractedText: string | undefined) {
  const htmlOnly = !text && !!html;
  const full = text ?? (html ? convert(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }, { selector: 'img', format: 'skip' }] }) : '');
  const a = sanitize(extractedText ?? full);
  return { body: a.text, hidden: a.hidden, bodyFull: sanitize(full).text, htmlOnly };
}

export function normalizeAgentMail(m: AgentMailMessage, eventType: string, eventId: string): NormalizedEmail {
  const { body, hidden, bodyFull, htmlOnly } = bodiesOf(m.text, m.html, m.extracted_text);
  return {
    providerEventId: eventId, source: 'agentmail', messageId: m.message_id, threadId: m.thread_id, inReplyTo: m.in_reply_to,
    receivedAt: m.timestamp ?? new Date().toISOString(),
    from: parseAddr(asArray(m.from ?? m.from_)[0] ?? ''),
    replyTo: asArray(m.reply_to).map(parseAddr), to: asArray(m.to).map((x) => parseAddr(x).address),
    subject: sanitize(m.subject ?? '').text, body, bodyFull, hiddenChars: hidden, htmlOnly,
    attachments: (m.attachments ?? []).map((a) => ({ filename: a.filename, contentType: a.content_type, size: a.size ?? 0 })),
    auth: authFromAgentMail(m.authentication_results),
    unauthenticatedLabel: eventType === 'message.received.unauthenticated' || !!m.labels?.includes('unauthenticated'),
    armor: m.agent_armor?.status === 'complete' ? (m.agent_armor.verdict as 'clear' | 'review') : (m.agent_armor?.status as 'pending' | 'unavailable' | undefined),
  };
}
