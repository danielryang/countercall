import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIVE_WINDOW_MS, FAST_MS, IDLE_PAUSE_MS, MAX_BACKOFF_MS, nextDelay, shouldPause, SLOW_MS } from './poll';

const base = { calling: false, now: 1_000_000, lastEventAt: 0, hidden: false, consecutiveErrors: 0 };
test('fast while a call is live, regardless of how old the last event is', () => assert.equal(nextDelay({ ...base, calling: true }), FAST_MS));
test('fast for a minute after an event, then slow', () => {
  assert.equal(nextDelay({ ...base, lastEventAt: base.now - ACTIVE_WINDOW_MS + 1 }), FAST_MS);
  assert.equal(nextDelay({ ...base, lastEventAt: base.now - ACTIVE_WINDOW_MS }), SLOW_MS);
});
test('a hidden tab is always slow, even mid-call', () => assert.equal(nextDelay({ ...base, calling: true, hidden: true }), SLOW_MS));
test('errors back off exponentially and cap', () => {
  const d = (n: number) => nextDelay({ ...base, calling: true, consecutiveErrors: n });
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(d), [1000, 2000, 4000, 8000, MAX_BACKOFF_MS, MAX_BACKOFF_MS]);
});
test('pauses after 10 idle minutes', () => {
  assert.equal(shouldPause(IDLE_PAUSE_MS, 0), false);
  assert.equal(shouldPause(IDLE_PAUSE_MS + 1, 0), true);
});
