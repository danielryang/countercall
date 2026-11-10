import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyHolds } from './holds';
import { DbMockRampClient } from './ramp.mock-db';
import { testDb } from './testing/pglite';
import { listVendors } from './vendors';

const digitsOf = (s: string) => s.replace(/\D/g, '');

test('vendor directory: six seeded vendors, Acme first with its three numbers and provenance, primary first', async () => {
  const t = await testDb();
  const vs = await listVendors(t.q);
  assert.equal(vs.length, 6);
  const acme = vs.find((v) => v.id === 'v_acme')!;
  assert.equal(acme.contacts.length, 3);
  assert.equal(acme.contacts[0].isPrimary, true);
  assert.equal(acme.contacts[0].source, 'onboarding_w9');
  assert.equal(acme.contacts[0].addedAt.slice(0, 10), '2025-03-14');
  assert.equal(acme.contacts[0].addedBy, 'A. Patel');
  assert.ok(acme.contacts[0].ageDays > 0);
  assert.equal(acme.contacts[0].phoneMasked, '+1••••••••42');   // length-preserving, last two only
  const q = acme.contacts.find((c) => c.status === 'quarantined')!;
  assert.ok(q && !q.isPrimary && q.quarantineReason);
  assert.equal(acme.bank?.last4Masked, '••4417');
  assert.equal(acme.scheduledCents, 2480000);
  assert.equal(acme.heldCents, 0);
  for (const v of vs) assert.equal(v.contacts.filter((c) => c.isPrimary).length, 1, `${v.id} has one primary`);
});

test('vendor directory: held amount and open cases come from real holds; the output never carries a phone number, routing number or challenge digits', async () => {
  const t = await testDb();
  const id = await t.heldCase('v_acme', '4321');
  await t.q(`update cases set challenge_expected = '4388' where id = $1`, [id]);   // the server-only secret (last paid Acme invoice)
  await applyHolds({ q: t.q, ramp: new DbMockRampClient(t.q), mode: 'mock', emit: (e) => t.emit(e) }, id, 'v_acme', ['pay_8101', 'pay_8102']);
  const vs = await listVendors(t.q);
  const acme = vs.find((v) => v.id === 'v_acme')!;
  assert.equal(acme.heldCents, 2480000);
  assert.equal(acme.casesOpen, 1);
  assert.equal(vs[0].id, 'v_acme', 'sorted by open cases first');

  const out = JSON.stringify(vs);
  assert.doesNotMatch(out, /\+[1-9]\d{7,14}/, 'no unmasked E.164');
  assert.doesNotMatch(out, /challenge|claimed|routing/i, 'no secret columns by name');
  assert.ok(!out.includes('4388'), 'challenge digits absent');
  assert.ok(!out.includes('4321'), 'claimed digits absent');
  const phones = (await t.q<{ p: string }>(`select phone_e164 p from trusted_contacts`)).map((r) => digitsOf(r.p));
  const routing = (await t.q<{ r: string }>(`select routing_number r from bank_accounts`)).map((r) => r.r);
  for (const run of out.match(/\d{4,}/g) ?? []) {
    for (let i = 0; i + 4 <= run.length; i++) {
      const g = run.slice(i, i + 4);
      assert.ok(!phones.some((p) => p.includes(g)), `digit run ${run} overlaps a phone number`);
    }
    assert.ok(!routing.some((r) => r.includes(run) || run.includes(r)), `digit run ${run} overlaps a routing number`);
  }
});
