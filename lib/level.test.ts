import { ulaw, rmsLevel, revealed } from './level.ts';
import assert from 'node:assert/strict';
assert.equal(ulaw(0xff), 0, 'mu-law 0xFF is digital silence');
assert.equal(ulaw(0x7f), 0);
assert.equal(ulaw(0x00), -32124); assert.equal(ulaw(0x80), 32124); // max magnitude
const silence = Buffer.alloc(160, 0xff).toString('base64');
const loud = Buffer.from(Array.from({ length: 160 }, (_, i) => (i % 2 ? 0x00 : 0x80))).toString('base64');
assert.equal(rmsLevel(silence), 0); assert.ok(rmsLevel(loud) > 0.9);
assert.equal(revealed('hello world', 0, false), 0);
assert.equal(revealed('x'.repeat(30), 1000, false), 15);
assert.equal(revealed('x'.repeat(30), 99999, false), 30);
console.log('level ok');
