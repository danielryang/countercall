import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainTask } from './copy';

test('operator task reasons are translated to everyday words, with no setting names or env vars', () => {
  assert.equal(plainTask('calls disabled (CALLS_ENABLED=0)'), 'Phone verification is switched off right now, so nobody was called');
  assert.match(plainTask('sender not on the inbound allowlist; recorded only, no hold and no call'), /not on the approved list/);
  assert.match(plainTask('a callback for this exact request is already open; not calling again'), /already open/);
  assert.match(plainTask('no trusted, seasoned phone number on file for this vendor'), /no verified phone number/i);
  for (const r of ['calls disabled (CALLS_ENABLED=0)', 'more than 3 calls to this vendor in the last hour', 'dial failed: boom', 'SOME_FLAG=1 weird reason']) assert.ok(!/[A-Z_]{5,}/.test(plainTask(r)), `no SETTING_NAME in: ${plainTask(r)}`);
});
