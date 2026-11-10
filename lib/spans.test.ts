import { segment, resolveQuote } from './spans.ts';
import assert from 'node:assert/strict';
const t = 'Please pay to the new account 9082 today. Call me on +1 302 555 0199.';
const a = t.indexOf('new account 9082'), b = t.indexOf('+1 302 555 0199');
const segs = segment(t, [
  { id: 'bank', start: a, end: a + 16, kind: 'bank_change' },
  { id: 'overlap', start: a + 4, end: a + 11, kind: 'bank_change' },
  { id: 'cb', start: b, end: b + 15, kind: 'callback_number' },
  { id: 'bad', start: 5, end: 3, kind: 'x' },        // dropped
  { id: 'oob', start: 0, end: 9999, kind: 'x' },     // dropped
]);
assert.equal(segs.map((s) => s.text).join(''), t, 'segments must reassemble the text');
assert.deepEqual(segs.filter((s) => s.spans.length).map((s) => s.spans.map((x) => x.id)), [['bank'], ['bank', 'overlap'], ['bank'], ['cb']]);
// emoji / surrogate pairs: offsets are UTF-16 code units (JS string index), Python would count code points
const e = 'ok 🙂 pay new acct';
const q = resolveQuote(e, 'pay new acct');
assert.equal(e.slice(q!.start, q!.end), 'pay new acct');
assert.equal(resolveQuote(e, 'not there'), null);
assert.deepEqual(resolveQuote(e, 'pay', 99), { start: e.indexOf('pay'), end: e.indexOf('pay') + 3 }); // bad hint falls back
console.log('spans ok');
