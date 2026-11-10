import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maskPhone, scrubPhones, toRow, type EmittedEvent } from './events';

test('scrubPhones masks every E.164 number, deeply, without mutating the input or changing string length', () => {
  const input = { a: 'call +14155550142 now', nested: [{ phone: '+13025550199' }], keep: 'no number here', n: 4 };
  const frozen = JSON.stringify(input);
  const out = scrubPhones(input);
  assert.equal(JSON.stringify(input), frozen, 'input untouched');
  assert.equal(out.a.length, input.a.length, 'length preserved so evidence offsets stay valid');
  assert.ok(!JSON.stringify(out).match(/\+\d{8,}/), 'no full number survives');
  assert.equal(maskPhone('+14155550142'), '+1' + '\u2022'.repeat(8) + '42');
  assert.equal(out.keep, 'no number here'); assert.equal(out.n, 4);
});

test('toRow masks the on-file number inside a case.flagged decision (found by the pipeline test)', () => {
  const e = { type: 'case.flagged', caseId: 'CC-0100', spans: [], decision: { actions: [{ type: 'START_CALLBACK', vendorId: 'v_acme', phone: '+14155550142' }] } } as unknown as EmittedEvent;
  const row = toRow(e);
  assert.ok(!JSON.stringify(row.payload).includes('4155550142'));
  assert.match(JSON.stringify(row.payload), /\+1•+42/);
});
