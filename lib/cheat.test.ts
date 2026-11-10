import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { cheatCards } from './cheat';
import { CHEAT_DIGITS } from './copy';
import { SCENARIOS } from './voice/scenarios';

test('one cheat-card per scripted call, with the same expected result the policy tests assert', () => {
  const cards = cheatCards();
  assert.deepEqual(cards.map((c) => c.name).sort(), SCENARIOS.map((s) => s.name).sort());
  assert.equal(cards[0].name, 'denied', 'the hero take comes first');
  for (const c of cards) assert.equal(c.result, SCENARIOS.find((s) => s.name === c.name)!.expected.outcome);
  assert.equal(cards.find((c) => c.name === 'denied')!.resultWord, 'Blocked');
  assert.equal(cards.find((c) => c.name === 'confirmed')!.resultWord, 'Verified');
});

test('the challenge answer never appears on a card: the confirmed card says the placeholder instead', () => {
  const confirmed = cheatCards().find((c) => c.name === 'confirmed')!;
  assert.ok(confirmed.says.includes(CHEAT_DIGITS));
  const all = JSON.stringify(cheatCards());
  assert.ok(!all.includes('CHEAT_SECRET'), 'the sentinel is replaced');
  assert.ok(!/\d{4}/.test(all), 'no four-digit run anywhere on any card');
  assert.ok(!/\+\d{6,}/.test(all), 'no phone number');
});

test('the callee lines are the scripted ones (the denied card tells them to say no)', () => {
  const denied = cheatCards().find((c) => c.name === 'denied')!;
  assert.ok(denied.says.some((l) => /haven't changed banks/.test(l)));
});

test('every linked recorded run exists in public/runs', () => {
  for (const c of cheatCards()) if (c.run) assert.ok(existsSync(`public/runs/${c.run}.json`), `missing public/runs/${c.run}.json`);
});
