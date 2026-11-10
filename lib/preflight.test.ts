import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChecks, summarize, type PreflightFacts } from './preflight';

const good: PreflightFacts = { dbOk: true, lastSeq: 10, openCases: 0, callsEnabled: true, rampMode: 'mock', allowedNumbers: 1, allowedSenders: 2,
  has: { anthropic: true, retellKey: true, retellAgent: true, retellFrom: true, agentmailKey: true, agentmailSecret: true } };

test('everything configured: ready, no failures or warnings', () => {
  const s = summarize(buildChecks(good));
  assert.deepEqual(s, { ready: true, fails: 0, warns: 0 });
});
test('database down is a failure and not ready', () => {
  assert.equal(summarize(buildChecks({ ...good, dbOk: false })).ready, false);
});
test('calls off is a warning, not a failure, and missing voice config only fails when calls are on', () => {
  const off = { ...good, callsEnabled: false, has: { ...good.has, retellAgent: false } };
  assert.deepEqual(summarize(buildChecks(off)), { ready: true, fails: 0, warns: 2 });
  assert.equal(summarize(buildChecks({ ...off, callsEnabled: true })).ready, false);
});
test('leftover open cases warn so the presenter resets first', () => {
  const c = buildChecks({ ...good, openCases: 2 }).find((x) => x.id === 'clean')!;
  assert.equal(c.level, 'warn'); assert.match(c.detail, /2 cases/);
});
test('details never contain secrets or phone-like strings', () => {
  const text = JSON.stringify(buildChecks(good));
  assert.ok(!/\+\d{6,}|sk-|re_|key=/.test(text));
});
