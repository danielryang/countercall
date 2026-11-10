import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BEAT_MS, CATCH_UP_BACKLOG, beatDelay, planBeats } from './beats';

test('a burst is released one story beat at a time: the pause comes after each state change', () => {
  const burst = ['email.received', 'email.classified', 'case.flagged', 'case.state', 'ramp.call', 'payment.held', 'case.state', 'call.requested'].map((type) => ({ type }));
  assert.deepEqual(planBeats(burst).map((p) => p.waitAfter), [0, 0, 0, BEAT_MS, 0, 0, BEAT_MS, 0]);
});

test('transcript, tool and status events never add delay (real-time speech is already paced)', () => {
  for (const type of ['call.transcript.delta', 'call.tool', 'call.status', 'call.recording']) assert.equal(beatDelay({ type }, 1), 0);
});

test('a large backlog (reload or reconnect) is applied at once, not replayed slowly', () => {
  assert.equal(beatDelay({ type: 'case.state' }, CATCH_UP_BACKLOG + 1), 0);
  assert.equal(beatDelay({ type: 'case.state' }, CATCH_UP_BACKLOG), BEAT_MS);
});
