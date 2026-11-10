import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { reduce } from './reducer';
import type { Run } from './runs';

// Run files are committed to a PUBLIC repo and served to judges. Recordings come from real calls, so this guards what must never be in them.
const DIR = new URL('../public/runs/', import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const load = (f: string) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8')) as Run;

test('no run file contains recording links, storage or hosting URLs, challenge digits, or a full phone number', () => {
  assert.ok(files.length >= 6, 'the generated runs and the live recording are present');
  for (const f of files) {
    const text = readFileSync(new URL(f, DIR), 'utf8');
    assert.ok(!/amazonaws|retellai|supabase|X-Amz|vercel\.app/i.test(text), `${f}: no real service URL`);
    assert.ok(!text.includes('4388'), `${f}: the challenge answer must not appear`);
    assert.ok(!/\+\d{10,15}/.test(text), `${f}: no full phone number`);
    for (const e of load(f).events.filter((x) => x.type === 'call.recording')) {
      const p = e.payload as { monoUrl?: string | null; stereoUrl?: string | null };
      for (const u of [p.monoUrl, p.stereoUrl]) assert.ok(!u || u.includes('example.invalid'), `${f}: recording links are stripped or fake`);
    }
  }
});

test('the live recording replays to the real outcome: the vendor denied, the case is blocked, the money stays held', () => {
  const r = load('fraud-live.json');
  assert.equal(r.source, 'recorded');
  const s = reduce(r.events);
  const hero = Object.values(s.cases).find((c) => c.call)!;
  assert.equal(hero.state, 'fraud_blocked');
  assert.equal(hero.call?.outcome?.decision.outcome, 'DENIED_FRAUD');
  assert.equal(hero.payments.reduce((n, b) => n + b.amountCents, 0), 2_480_000);
  assert.equal(hero.release, undefined);
});

test('the recorded inbound email replays to fail-closed: calls off, so no call is placed, the money stays held and a person takes over', () => {
  const r = load('email-live.json');
  assert.equal(r.source, 'recorded');
  const c = reduce(r.events).cases['CC-0111'];
  assert.ok(c, 'the recorded case is present');
  assert.equal(c.state, 'needs_human');
  // call.requested gives the case a call view; a call that was actually placed would also have call.created and an outcome.
  assert.ok(!r.events.some((e) => e.type === 'call.created'), 'no call was placed');
  assert.equal(c.call?.outcome, undefined, 'no call outcome');
  assert.equal(c.payments.reduce((n, b) => n + b.amountCents, 0), 2_480_000);
  assert.equal(c.release, undefined);
  assert.ok(r.events.some((e) => e.type === 'task.created' && /calls disabled/.test(JSON.stringify(e.payload))), 'the hand-off says why');
});
