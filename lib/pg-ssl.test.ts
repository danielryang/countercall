import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sslFor } from './pg-ssl';

/** A pooler URL with a password, encoded the way a real one is (built at runtime: no credential-shaped string in the source). */
function withPassword(hostPort: string, password: string): string {
  const u = new URL(`postgres://${hostPort}/postgres`);
  u.username = 'postgres.abcd';
  u.password = password;
  return u.toString();
}

test('database TLS: encrypted by default for a remote database, the URL can override, local databases are left alone', () => {
  // the Supabase transaction pooler (the production shape): TLS required, with or without a password, however the password is encoded
  assert.equal(sslFor(withPassword('aws-0-us-west-2.pooler.supabase.com:6543', 'p@ss/w:rd')), 'require', 'percent-encoded password');
  assert.equal(sslFor('postgres://postgres.abcd@aws-0-us-west-2.pooler.supabase.com:6543/postgres'), 'require');
  // the URL chooses: leave it to postgres.js
  assert.equal(sslFor('postgres://u@db.example.com:6543/postgres?sslmode=disable'), undefined);
  assert.equal(sslFor('postgres://u@db.example.com:6543/postgres?sslmode=verify-full'), undefined);
  assert.equal(sslFor('postgres://u@db.example.com/app?application_name=x&ssl=true'), undefined);
  // this machine: no TLS (the fake pooler in lib/testing/fake-pooler.ts, a local Postgres)
  assert.equal(sslFor('postgres://test@127.0.0.1:54321/test'), undefined);
  assert.equal(sslFor('postgres://u@localhost:5432/app'), undefined);
  assert.equal(sslFor(withPassword('[::1]:5432', 'pw')), undefined);
  // nothing configured (next build imports every route): no client options
  assert.equal(sslFor(''), undefined);
  assert.equal(sslFor(undefined), undefined);
});
