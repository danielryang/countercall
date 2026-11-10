// eval/unit.ts - the smallest check that fails if the money-path primitives break.  npx tsx eval/unit.ts
import assert from 'node:assert/strict';
import { abaChecksumOk, editDistance, ibanOk, lookalike, registrable, skeleton } from '../lib/detect/signals';
import { locate } from '../lib/detect/extract';
import { sanitize } from '../lib/detect/normalize';

assert.equal(abaChecksumOk('021000021'), true);   // JPMorgan Chase (public)
assert.equal(abaChecksumOk('121007775'), true);   // fixture on-file number
assert.equal(abaChecksumOk('021000022'), false);  // one digit off
assert.equal(abaChecksumOk('12345678'), false);   // 8 digits
assert.equal(ibanOk('DE89 3704 0044 0532 0130 00'), true);
assert.equal(ibanOk('DE89 3704 0044 0532 0130 01'), false);
assert.equal(editDistance('acmecorp', 'acmecrop'), 1); // transposition counts as 1
const V = ['acmecorp.com'];
const cases: [string, string | null][] = [
  ['acmecorp.com', null], ['mail.acmecorp.com', null], ['gmail.com', null], ['globex-industrial.com', null], ['acme.com', null],
  ['acme-corp.co', 'hyphen_variant'], ['acmecorp.co', 'tld_swap'], ['acmecorp.co.uk', 'tld_swap'], ['acmecorp.com.evil.io', 'subdomain_trick'],
  ['acrnecorp.com', 'homoglyph'], ['acmec0rp.com', 'homoglyph'], ['xn--acmecrp-ejg.com', 'idn_homoglyph'], ['acmecrp.com', 'edit_distance_1'],
  ['acmecorp-billing.com', 'keyword_wrap'], ['secure-acmecorp.net', 'keyword_wrap'],
];
for (const [host, want] of cases) assert.equal(lookalike(host, V)?.kind ?? null, want, host);
assert.equal(registrable('a.b.example.co.uk'), 'example.co.uk');
assert.equal(skeleton('acmecоrp'), skeleton('acmecorp')); // Cyrillic o
// evidence offsets: exact, whitespace-tolerant, and hallucinated
const body = 'Hello,\n\nWe have   changed\nbanks. Routing: 071003913';
assert.deepEqual(locate(body, 'Routing: 071003913'), { start: body.indexOf('Routing'), end: body.length });
const w = locate(body, 'We have changed banks.'); assert.equal(body.slice(w!.start, w!.end), 'We have   changed\nbanks.');
assert.equal(locate(body, 'wire $50,000 today'), null);
// sanitizer: zero-width + tag chars + full-width digits
const s = sanitize('Rou​ting ０２１００００２１\u{E0041}');
assert.equal(s.text, 'Routing 021000021'); assert.equal(s.hidden, 2);
// false-positive guard: benign vendor wording must NOT look like a payment-instruction change
import { computeSignals } from '../lib/detect/signals';
const org = { domain: 'ricerobotics.com', execNames: [] };
const mk = (body: string) => ({ providerEventId: 'x', source: 'injector' as const, messageId: '<x>', receivedAt: '', from: { address: 'ap@acmecorp.com' }, replyTo: [], to: [], subject: '', body, bodyFull: body, hiddenChars: 0, htmlOnly: false, attachments: [], auth: { spf: 'pass' as const, dkim: 'pass' as const, dmarc: 'pass' as const }, unauthenticatedLabel: false });
for (const t of ['Please find attached invoice 4472. Net 30.', 'Please update your records with our new W-9 form.', 'Remit to: Acme Corp, 100 Main St. See attached invoice.', 'We updated our website and our new office is at 100 Main St.', 'Thanks for your call today.'])
  assert.equal(computeSignals(mk(t), null, org).signals.some((s) => s.id === 'bank_change_language' || s.id === 'urgency_language'), false, t);
for (const t of ['We have switched banks.', 'Please see our updated remittance details.', 'Our new factoring partner is Brightline.', 'Updated payment instructions are attached.', 'New banking details below.'])
  assert.equal(computeSignals(mk(t), null, org).signals.some((s) => s.id === 'bank_change_language'), true, t);
console.log('unit: all assertions passed');
