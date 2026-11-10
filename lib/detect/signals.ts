// src/signals.ts - deterministic signals. Pure functions, no I/O, no LLM. Every hit carries char spans into email.body.
import { domainToASCII, domainToUnicode } from 'node:url';
import type { Facts, NormalizedEmail, OrgConfig, Severity, Signal, SignalId, Span, Vendor, VendorMatch } from './types';

// ---------- checksums ----------
/** ABA routing number: 3(d1+d4+d7) + 7(d2+d5+d8) + (d3+d6+d9) must be 0 mod 10. Checksum-valid != real bank. */
export function abaChecksumOk(rtn: string): boolean {
  if (!/^\d{9}$/.test(rtn)) return false;
  const d = [...rtn].map(Number);
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0;
}

/** IBAN mod-97 (ISO 13616). Moves first 4 chars to the end, letters -> 10..35, remainder must be 1. */
export function ibanOk(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  let rem = 0;
  for (const ch of s.slice(4) + s.slice(0, 4)) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const c of v) rem = (rem * 10 + Number(c)) % 97;
  }
  return rem === 1;
}

// ---------- domains ----------
const FREEMAIL = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'aol.com', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com']);
const MULTI_TLD = new Set(['co.uk', 'org.uk', 'com.au', 'co.jp', 'com.br', 'co.in', 'com.mx', 'co.nz']); // ponytail: use `tldts` if you need the full PSL

export const domainOf = (addr: string) => addr.slice(addr.lastIndexOf('@') + 1).toLowerCase();
export function registrable(host: string): string {
  const parts = host.toLowerCase().split('.').filter(Boolean);
  const last2 = parts.slice(-2).join('.');
  return MULTI_TLD.has(last2) ? parts.slice(-3).join('.') : last2;
}
const sld = (reg: string) => reg.split('.')[0];
const tld = (reg: string) => reg.split('.').slice(1).join('.');

/** Optimal-string-alignment (Damerau-Levenshtein) distance. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

// Cyrillic/Greek look-alikes + digit/letter swaps. ponytail: tiny table; swap in Unicode TR39 `confusables` data for completeness.
const CONFUSABLE: Record<string, string> = { а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', ο: 'o', α: 'a', ν: 'v', ι: 'i', '0': 'o', '1': 'l', '5': 's', i: 'l', '!': 'l' };
export function skeleton(s: string): string {
  const x = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return [...x].map((c) => CONFUSABLE[c] ?? c).join('').replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
}

export type LookalikeKind = 'idn_homoglyph' | 'homoglyph' | 'tld_swap' | 'hyphen_variant' | 'edit_distance_1' | 'edit_distance_2' | 'keyword_wrap' | 'subdomain_trick';

/** Is `host` a lookalike of any vendor domain on file? Exact/subdomain-of-vendor => null (that's the real domain). */
export function lookalike(host: string, vendorDomains: string[]): { kind: LookalikeKind; target: string } | null {
  const h = host.toLowerCase();
  const reg = registrable(h);
  if (vendorDomains.includes(reg)) return null; // the real domain or a subdomain of it
  const isIdn = h.includes('xn--') || /[^\x00-\x7f]/.test(h);
  for (const v of vendorDomains) if (`.${h}.`.includes(`.${v}.`)) return { kind: 'subdomain_trick', target: v }; // acmecorp.com.evil.io
  for (const v of vendorDomains) {
    const vs = sld(v), cs = sld(isIdn ? registrable(domainToUnicode(h)) : reg);
    if (isIdn && skeleton(cs) === skeleton(vs)) return { kind: 'idn_homoglyph', target: v };
    if (cs === vs && tld(reg) !== tld(v)) return { kind: 'tld_swap', target: v };
    if (cs !== vs && cs.replace(/-/g, '') === vs.replace(/-/g, '')) return { kind: 'hyphen_variant', target: v };
    if (cs !== vs && skeleton(cs) === skeleton(vs)) return { kind: 'homoglyph', target: v };
    const ed = editDistance(cs, vs);
    if (vs.length >= 5 && ed === 1) return { kind: 'edit_distance_1', target: v };
    if (vs.length >= 7 && ed === 2) return { kind: 'edit_distance_2', target: v };
    if (cs !== vs && new RegExp(`(^|-)${vs}(-|$)`).test(cs)) return { kind: 'keyword_wrap', target: v }; // acmecorp-billing.com
  }
  return null;
}
export const punycode = (host: string) => domainToASCII(host);

// ---------- lexicons (each returns spans) ----------
function spansOf(body: string, re: RegExp, label: string): Span[] {
  return [...body.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))].map((m) => ({ start: m.index!, end: m.index! + m[0].length, label, source: 'rule' as const }));
}
const BANK_CHANGE = /\b(?:(?:new|updated?|changed?|different|revised)\s+(?:bank(?:ing)?|remittance|payment|wire|ach|deposit)\s+(?:details|instructions|information|info|account|coordinates)|(?:we(?:'ve|\s+have)?\s+)?(?:changed|switched|moved|updated)\s+(?:our\s+)?(?:banks?|bank accounts?|banking)|(?:please\s+)?(?:update|change)\s+(?:your\s+)?(?:records\s+(?:with|to)\s+(?:our\s+)?new\s+(?:bank|account|payment)|(?:payment|banking|remittance)\s+(?:details|info|information))|factoring (?:partner|company)|assign(?:ed|ment)\s+of\s+(?:our\s+)?(?:receivables|invoices)|remit(?:tance)?\s+(?:to|details|instructions)[^.\n]{0,40}\b(?:new|updated|revised|attached\s+(?:letter|notice|form|instructions))|per\s+(?:the\s+)?attached\s+(?:letter|form|notice|instructions))\b/gi;
const URGENCY = /\b(?:urgent(?:ly)?|asap|immediately|right away|(?:need|needed|send|sent|wire|pay|process|complete|done)\b[^\n]{0,40}\btoday|by (?:eod|end of (?:the )?day|close of business|cob)|time[- ]sensitive|before (?:noon|5 ?pm)|past due|late fees?|penalt(?:y|ies)|final notice)\b/gi;
const NO_CALL = /\b(?:do(?:n't| not)\s+(?:call|phone|ring|verify|contact|discuss)|(?:please\s+)?(?:only|just)\s+(?:reply|respond|email)|(?:phones?|lines?)\s+(?:are\s+)?down|can(?:'t|not)\s+(?:take|answer)\s+calls|keep (?:this|it) (?:confidential|between us|quiet)|(?:strictly|highly) confidential|no need to (?:call|verify))\b/gi;
const INJECTION = /(?:ignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|rules|prompts?)|\b(?:ai|llm|language model|chatbot|assistant)\b[^.\n]{0,40}\b(?:mark|classify|set|output|respond|reply|approve|release|verify)|mark\s+(?:this|the vendor|it|as)[^.\n]{0,20}\b(?:verified|approved|safe|legit(?:imate)?)|system\s*prompt|you\s+are\s+now\b|note\s+to\s+(?:the\s+)?(?:automated|ai|llm|processing|review)\w*|is_payment_instruction_change|\bclassify\s+(?:this\s+)?as\b|new\s+instructions?:|\[\/?(?:system|inst)\]|<\/?(?:system|instructions?)>|do\s+not\s+(?:flag|hold|escalate))/gi;
const ACCT_CTX = /(?:acct|account|a\/c|acc\.?)\s*(?:number|no\.?|#|num)?\s*(ending(?:\s+in)?|ends\s+in|last\s+(?:4|four))?\s*[:#-]?\s*(\d[\d -]{2,21}\d)/gi;
const RTN_CTX = /(?:routing|aba|rtn|transit)(?:\s*(?:number|no\.?|#))?\s*[:#-]?\s*(\d[\d -]{7,12}\d)/gi;
const IBAN_RE = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Za-z0-9]{4}){2,7}(?:[ ]?[A-Za-z0-9]{1,3})?\b/g;
const PHONE_RE = /(?<![\d$])(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)|\+\d{1,3}[\s.-]?\d{1,4}(?:[\s.-]?\d{2,4}){2,4}/g;
const MONEY_RE = /(?:\$|USD\s?)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/g;
const INVOICE_RE = /\binv(?:oice)?\s*(?:no\.?|number|#)?\s*[:#-]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{2,})/gi;

const digits = (s: string) => s.replace(/\D/g, '');
const toE164 = (s: string) => { const d = digits(s); return s.trim().startsWith('+') ? '+' + d : d.length === 10 ? '+1' + d : d.length === 11 && d[0] === '1' ? '+' + d : '+' + d; };

// ---------- vendor resolution (pre-LLM) ----------
export function resolveVendor(e: NormalizedEmail, vendors: Vendor[]): VendorMatch | null {
  const senderDomain = domainOf(e.from.address);
  const hay = (e.subject + '\n' + e.body + '\n' + (e.from.name ?? '')).toLowerCase();
  const byName = (v: Vendor) => new RegExp(`\\b${v.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, '\\s+')}\\b`).test(hay.replace(/[^a-z0-9\n ]/g, ''));
  for (const v of vendors) if (v.knownContacts.includes(e.from.address)) return { vendor: v, via: 'known_contact' };
  for (const v of vendors) if (v.domains.includes(registrable(senderDomain))) return { vendor: v, via: 'sender_domain' };
  const hosts = [senderDomain, ...e.replyTo.map((r) => domainOf(r.address))];
  for (const v of vendors) if (hosts.some((h) => lookalike(h, v.domains))) return { vendor: v, via: 'lookalike_domain' };
  for (const v of vendors) if (e.from.name && new RegExp(`\\b${v.name.split(' ')[0].toLowerCase()}\\b`).test(e.from.name.toLowerCase())) return { vendor: v, via: 'display_name' };
  const mentioned = vendors.filter(byName);
  if (mentioned.length === 1) return { vendor: mentioned[0], via: 'body_mention' };
  return null;
}

// ---------- the signal pass ----------
const sig = (id: SignalId, severity: Severity, detail: string, spans: Span[] = []): Signal => ({ id, severity, detail, spans });

export function computeSignals(e: NormalizedEmail, vendor: Vendor | null, org: OrgConfig): { signals: Signal[]; facts: Facts } {
  const out: Signal[] = [];
  const body = e.body;
  const senderDomain = domainOf(e.from.address);
  const facts: Facts = { phones: [], amountsCents: [], invoiceNumbers: [] };

  // 1. auth. NOTE: 'pass' proves only that the *claimed sending domain* signed it. A lookalike domain passes too.
  const a = e.auth;
  if (!a) out.push(sig('auth_unknown', 'low', 'Provider returned no SPF/DKIM/DMARC verdicts; treated as unverified, not as pass.'));
  else {
    if (a.dmarc === 'fail') out.push(sig('auth_dmarc_fail', 'critical', `DMARC fail for ${a.dmarcDomain ?? senderDomain}: sender likely spoofed.`));
    if (a.spf === 'fail' || a.spf === 'softfail') out.push(sig('auth_spf_fail', 'high', `SPF ${a.spf} for ${a.spfDomain ?? senderDomain}.`));
    if (a.dkim === 'fail') out.push(sig('auth_dkim_fail', 'high', `DKIM fail (${a.dkimDomain ?? 'unknown signer'}).`));
  }
  if (e.unauthenticatedLabel) out.push(sig('auth_unauthenticated', 'high', 'No SPF/DKIM/DMARC mechanism passed (provider labelled the message unauthenticated).'));

  // 2. From vs Reply-To
  const rt = e.replyTo.find((r) => registrable(domainOf(r.address)) !== registrable(senderDomain));
  if (rt) {
    const rtd = domainOf(rt.address);
    const onFile = !!vendor && vendor.domains.includes(registrable(rtd));
    out.push(sig('reply_to_mismatch', onFile ? 'low' : vendor || FREEMAIL.has(rtd) ? 'high' : 'medium', `Reply-To ${rt.address} is on a different domain than From (${senderDomain}); replies would go elsewhere.`));
  }

  // 3. who is this sender vs the vendor on file
  if (vendor) {
    const dom = registrable(senderDomain);
    const knownExactly = vendor.knownContacts.includes(e.from.address); // a vendor contact on Gmail is fine if THAT address is on file
    const lk = [senderDomain, ...e.replyTo.map((r) => domainOf(r.address))].map((h) => ({ h, l: lookalike(h, vendor.domains) })).find((x) => x.l);
    if (lk?.l) out.push(sig('lookalike_domain', lk.l.kind === 'edit_distance_2' || lk.l.kind === 'keyword_wrap' ? 'high' : 'critical', `${lk.h}${lk.h.includes('xn--') ? ` (${domainToUnicode(lk.h)})` : ''} imitates ${lk.l.target} [${lk.l.kind}].`));
    else if (!vendor.domains.includes(dom) && !knownExactly) out.push(sig('sender_domain_not_on_file', FREEMAIL.has(dom) ? 'high' : 'medium', `${senderDomain} is not a domain on file for ${vendor.name} (${vendor.domains.join(', ')}).`));
    if (FREEMAIL.has(dom) && !knownExactly) out.push(sig('freemail_sender', 'high', `Sender uses free mail provider ${dom} but is writing about ${vendor.name}.`));
    if (!knownExactly) out.push(sig('sender_not_known_contact', 'low', `${e.from.address} has never corresponded for ${vendor.name} (first-time sender).`));
    if (!knownExactly && e.from.name && !vendor.domains.includes(dom) && !/\b(?:via|on behalf of)\b/i.test(e.from.name) && new RegExp(`\\b${vendor.name.split(' ')[0]}\\b`, 'i').test(e.from.name))
      out.push(sig('display_name_impersonation', 'high', `Display name "${e.from.name}" claims ${vendor.name} but domain is ${senderDomain}.`));
  }
  const exec = org.execNames.find((n) => e.from.name && e.from.name.toLowerCase().includes(n.toLowerCase()));
  if (exec && !senderDomain.endsWith(org.domain)) out.push(sig('executive_impersonation', 'critical', `Display name "${e.from.name}" matches ${exec} but sender domain is ${senderDomain}.`));

  // 4. bank details in the NEW content (quoted history is excluded because e.body is reply-extracted)
  const bankSpans: Span[] = [];
  for (const m of body.matchAll(RTN_CTX)) {
    const v = digits(m[1]);
    if (v.length !== 9) continue;
    const s = m.index! + m[0].lastIndexOf(m[1]);
    bankSpans.push({ start: s, end: s + m[1].length, label: 'routing number', source: 'rule' });
    facts.routing = { value: v, checksumOk: abaChecksumOk(v) };
  }
  for (const m of body.matchAll(ACCT_CTX)) {
    const v = digits(m[2]);
    if (m[1] ? v.length < 4 : v.length < 6 || v.length > 17) continue;
    const s = m.index! + m[0].lastIndexOf(m[2]);
    bankSpans.push({ start: s, end: s + m[2].length, label: 'account number', source: 'rule' });
    facts.accountLast4 = v.slice(-4);
  }
  for (const m of body.matchAll(IBAN_RE)) if (ibanOk(m[0])) { facts.iban = m[0].replace(/\s/g, ''); bankSpans.push({ start: m.index!, end: m.index! + m[0].length, label: 'IBAN', source: 'rule' }); }
  const hasDetails = !!(facts.routing || facts.accountLast4 || facts.iban);
  if (hasDetails) out.push(sig('bank_details_present', 'medium', `Bank details in email: ${[facts.routing && 'routing ' + facts.routing.value, facts.accountLast4 && 'acct ****' + facts.accountLast4, facts.iban && 'IBAN ' + facts.iban.slice(0, 4) + '...'].filter(Boolean).join(', ')}.`, bankSpans));
  if (facts.routing && !facts.routing.checksumOk) out.push(sig('routing_checksum_invalid', 'medium', `Routing ${facts.routing.value} fails the ABA checksum (typo or fabricated).`, bankSpans.filter((s) => s.label === 'routing number')));
  if (hasDetails && vendor) {
    const same = (!facts.routing || facts.routing.value === vendor.bank.routing) && (!facts.accountLast4 || facts.accountLast4 === vendor.bank.accountLast4) && !facts.iban;
    out.push(same ? sig('bank_details_match_on_file', 'info', 'Bank details in email match what is on file.') : sig('bank_details_differ', 'high', `Bank details differ from on file (${vendor.bank.bankName} ****${vendor.bank.accountLast4}).`, bankSpans));
  }

  // 5. language + attachment
  const lang = spansOf(body, BANK_CHANGE, 'bank-change wording');
  if (lang.length) out.push(sig('bank_change_language', 'medium', 'Wording typical of a payment-instruction change.', lang));
  if (e.attachments.length && lang.length && !hasDetails) out.push(sig('attachment_may_hold_details', 'medium', `Email points to an attachment (${e.attachments.map((x) => x.filename ?? 'unnamed').join(', ')}) that we do not parse; details may be inside.`));
  const urg = spansOf(body, URGENCY, 'urgency');
  if (urg.length) out.push(sig('urgency_language', 'medium', 'Urgency / deadline pressure.', urg));
  const nc = spansOf(body, NO_CALL, 'discourages verification');
  if (nc.length) out.push(sig('secrecy_no_callback', 'high', 'Discourages calling / verification, or asks for secrecy.', nc));
  const inj = spansOf(body, INJECTION, 'instructions to an AI');
  if (inj.length || e.armor === 'review') out.push(sig('injection_markers', 'high', e.armor === 'review' && !inj.length ? 'Agent Armor flagged possible prompt injection.' : 'Email contains text addressed to an AI system. Legitimate vendors never do this.', inj));
  if (e.hiddenChars > 0) out.push(sig('hidden_text', 'medium', `${e.hiddenChars} invisible/bidi characters were stripped from the body.`));

  // 6. phones: record, never dial
  const overlapsBank = (a: number, b: number) => bankSpans.some((s) => a < s.end && b > s.start);
  const phoneSpans: Span[] = [];
  for (const m of body.matchAll(PHONE_RE)) {
    if (overlapsBank(m.index!, m.index! + m[0].length)) continue;
    const e164 = toE164(m[0]);
    facts.phones.push({ e164, matchesOnFile: !!vendor && digits(e164).slice(-10) === digits(vendor.trustedPhone).slice(-10) });
    phoneSpans.push({ start: m.index!, end: m.index! + m[0].length, label: 'phone number in email (never dialed)', source: 'rule' });
  }
  if (facts.phones.length) out.push(sig('phone_in_email', facts.phones.every((p) => p.matchesOnFile) ? 'info' : 'medium', `Phone in email: ${facts.phones.map((p) => p.e164 + (p.matchesOnFile ? ' (matches file)' : ' (NOT on file)')).join(', ')}. Recorded only. CounterCall dials the on-file number, never this one.`, phoneSpans));

  // 7. amounts
  for (const m of body.matchAll(MONEY_RE)) facts.amountsCents.push(Math.round(Number(m[1].replace(/,/g, '') + '.' + (m[2] ?? '00')) * 100));
  for (const m of body.matchAll(INVOICE_RE)) facts.invoiceNumbers.push(m[1].toUpperCase());
  if (vendor && facts.amountsCents.length) {
    const big = Math.max(...facts.amountsCents);
    const moneySpans = spansOf(body, MONEY_RE, 'amount');
    if (big > vendor.typicalInvoiceCents * 5) out.push(sig('amount_outlier', 'high', `$${(big / 100).toLocaleString()} is ${(big / vendor.typicalInvoiceCents).toFixed(1)}x this vendor's typical invoice.`, moneySpans));
    const inv = vendor.openInvoices.find((i) => facts.invoiceNumbers.includes(i.number.toUpperCase()));
    if (inv && !facts.amountsCents.some((c) => c === inv.amountCents)) out.push(sig('amount_mismatch_invoice', 'medium', `Invoice ${inv.number} is $${(inv.amountCents / 100).toLocaleString()} on file but the email states different amounts.`, moneySpans));
  }
  return { signals: out, facts };
}
