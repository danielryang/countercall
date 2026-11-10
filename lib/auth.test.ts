import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resetEnvCache, senderAllowed } from './env';

process.env.DATABASE_URL = 'postgres://x'; process.env.SESSION_SECRET = 'a'.repeat(32); process.env.DEMO_PASSCODE = 'open sesame';
resetEnvCache();
const { sign, verify, passcodeOk, validName, sameOriginJson } = await import('./auth');

test('a signed session verifies and carries the name', () => {
  assert.equal(verify(sign('Eric Kim'))?.n, 'Eric Kim');
});
test('a tampered or expired session is rejected', () => {
  const t = sign('Eric Kim', 0);
  assert.equal(verify(t), null, 'expired (signed at epoch)');
  const good = sign('Eric Kim');
  assert.equal(verify(good.slice(0, -2) + 'xx'), null, 'bad mac');
  assert.equal(verify(undefined), null);
  assert.equal(verify('garbage'), null);
});
test('passcode compare and name validation', () => {
  assert.ok(passcodeOk('open sesame'));
  assert.ok(!passcodeOk('open sesamE'));
  assert.ok(validName("A. Patel") && !validName('x') && !validName('<script>'));
});
test('sameOriginJson requires matching Origin and JSON content-type', () => {
  const mk = (h: Record<string, string>) => new Request('https://app.test/api/x', { method: 'POST', headers: h });
  assert.ok(sameOriginJson(mk({ origin: 'https://app.test', host: 'app.test', 'content-type': 'application/json' })));
  assert.ok(!sameOriginJson(mk({ origin: 'https://evil.test', host: 'app.test', 'content-type': 'application/json' })));
  assert.ok(!sameOriginJson(mk({ host: 'app.test', 'content-type': 'application/json' })));
  assert.ok(!sameOriginJson(mk({ origin: 'https://app.test', host: 'app.test', 'content-type': 'text/plain' })));
});
test('senderAllowed matches addresses and domains, and an empty list allows nobody', () => {
  assert.ok(senderAllowed('Bad@Gmail.com', ['bad@gmail.com']));
  assert.ok(senderAllowed('x@acme-corp.co', ['acme-corp.co']));
  assert.ok(!senderAllowed('x@evil.co', ['acme-corp.co']));
  assert.ok(!senderAllowed('x@acme-corp.co', []));
});
