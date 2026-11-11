import assert from 'node:assert/strict';
import { test } from 'node:test';
import { holdingResult, MAX_HOLD_MS, MAX_LINE_MS, newClock, READ_HOLD_MS, REVEAL_CPS, revealAt } from './reveal';

const line = (id: string, n: number) => ({ id, text: 'x'.repeat(n) });
const ms = (chars: number) => (chars / REVEAL_CPS) * 1000;
/** How long a line of `chars` takes to appear: speaking-times-three, but never longer than MAX_LINE_MS. */
const dur = (chars: number) => Math.min(MAX_LINE_MS, ms(chars));

test('an answer never shows before its question has finished: lines type strictly in order, one at a time', () => {
  const clock = newClock();
  const q1 = line('agent_0', 90), a1 = line('user_1', 18), q2 = line('agent_2', 45);
  const lines = [q1, a1, q2];                                               // one Retell update brings a question, its answer and the next question
  const at = (t: number) => [...revealAt(clock, lines, t).chars.values()];
  assert.deepEqual(at(1000), [0, 0, 0]);
  assert.deepEqual(at(1000 + dur(90) / 2), [45, 0, 0], 'halfway through the question, the answer is not shown');
  assert.deepEqual(at(1000 + dur(90) - 1), [89, 0, 0]);
  assert.deepEqual(at(1000 + dur(90)), [90, 0, 0], 'the question is complete; the answer starts now');
  assert.deepEqual(at(1000 + dur(90) + dur(18)), [90, 18, 0]);
  assert.deepEqual(at(1000 + dur(90) + dur(18) + dur(45)), [90, 18, 45]);
  assert.ok(revealAt(clock, lines, 1000 + dur(90) + dur(18) + dur(45)).settled);
});

test('the pace: short lines type at three times speaking speed, and no line takes longer than MAX_LINE_MS (it was already spoken)', () => {
  assert.equal(REVEAL_CPS, 45);
  assert.ok(MAX_LINE_MS <= 2500, 'a long line must not leave the screen seconds behind the call');
  const clock = newClock(); const q = line('agent_0', 190);                 // a typical opening question
  assert.equal(revealAt(clock, [q], 0).chars.get('agent_0'), 0);
  assert.equal(revealAt(clock, [q], MAX_LINE_MS).chars.get('agent_0'), 190, 'the whole opening line, within MAX_LINE_MS');
  const c2 = newClock(); const a = line('user_1', 14);                      // "Yes, speaking."
  assert.equal(revealAt(c2, [a], 0).chars.get('user_1'), 0);
  assert.equal(revealAt(c2, [a], ms(14)).chars.get('user_1'), 14, 'a short reply still types at REVEAL_CPS');
});

test('a line that arrives after the one above it finished starts when it arrives', () => {
  const clock = newClock(); const q = line('agent_0', 45), a = line('user_1', 9);
  revealAt(clock, [q], 0); revealAt(clock, [q], 5000);                     // the question finished at 1 s; the answer arrives at 5 s
  assert.equal(revealAt(clock, [q, a], 5000).chars.get('user_1'), 0);
  assert.equal(revealAt(clock, [q, a], 5100).chars.get('user_1'), 4);
});

test('lines already on screen when the view opens are shown whole; new lines type after them', () => {
  const old = [line('agent_0', 80), line('user_1', 10)];
  const clock = newClock(old);
  const r = revealAt(clock, [...old, line('agent_2', 45)], 2000);
  assert.deepEqual([...r.chars.values()], [80, 10, 0]);
  assert.equal(revealAt(clock, [...old, line('agent_2', 45)], 2000 + ms(45)).chars.get('agent_2'), 45);
});

test('words added to a finished line appear at once and never hide or restart the line below it', () => {
  const clock = newClock();
  revealAt(clock, [line('user_0', 3)], 0); revealAt(clock, [line('user_0', 3)], 100);   // "No." finished
  revealAt(clock, [line('user_0', 3), line('agent_1', 90)], 200);
  const r = revealAt(clock, [line('user_0', 29), line('agent_1', 90)], 1200);            // "No, we haven't changed banks." while the next line types
  assert.equal(r.chars.get('user_0'), 29);
  assert.equal(r.chars.get('agent_1'), Math.min(90, Math.floor(((1200 - 200) / dur(90)) * 90)), 'the line below keeps its own clock (here already complete)');
});

test('reduced motion: no typing, every line whole at once, still in order', () => {
  const clock = newClock();
  const r = revealAt(clock, [line('agent_0', 120), line('user_1', 12)], 0, Infinity);
  assert.deepEqual([...r.chars.values()], [120, 12]);
  assert.ok(r.settled);
});

test('property: across random calls, a line is never shown before every line above it is complete, and shown text never shrinks', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let run = 0; run < 300; run++) {
    const clock = newClock(); let lines: { id: string; text: string }[] = []; let t = 0; const seen = new Map<string, number>();
    for (let u = 0; u < 12; u++) {
      t += 8 * 400 + rnd() * 6000;                                            // the clock only moves forward: past the last sample, then a random gap
      if (lines.length && rnd() < 0.3) { const last = lines.at(-1)!; lines = [...lines.slice(0, -1), { ...last, text: last.text + ' more words' }]; }   // the last line grows
      for (let k = rnd() < 0.5 ? 1 : 2; k > 0; k--) lines = [...lines, line(`${lines.length % 2 ? 'user' : 'agent'}_${lines.length}`, 5 + Math.floor(rnd() * 180))];
      for (let s = 0; s < 8; s++) {
        const now = t + s * 400;
        const { chars } = revealAt(clock, lines, now);
        lines.forEach((l, i) => {
          const n = chars.get(l.id)!;
          if (n > 0) for (let j = 0; j < i; j++) assert.equal(chars.get(lines[j].id), lines[j].text.length, `run ${run}: line ${i} shows while line ${j} is incomplete`);
          assert.ok(n >= (seen.get(l.id) ?? 0), `run ${run}: line ${i} went backwards`); seen.set(l.id, n);
        });
      }
    }
  }
});

test('the result waits for the transcript: while it types, then until it has been readable for READ_HOLD_MS; never on a reload; never forever', () => {
  const base = { watched: true, outcomeAt: 10_000, lines: 5 };
  assert.equal(holdingResult({ ...base, settledAt: null, now: 12_000 }), true, 'the last lines are still typing');
  assert.equal(holdingResult({ ...base, settledAt: 13_000, now: 13_000 + READ_HOLD_MS - 1 }), true, 'readable for less than the hold');
  assert.equal(holdingResult({ ...base, settledAt: 13_000, now: 13_000 + READ_HOLD_MS }), false, 'then the result');
  assert.equal(holdingResult({ ...base, settledAt: 4_000, now: 10_000 + READ_HOLD_MS - 1 }), true, 'even a transcript that finished early stays a moment after the result arrives');
  assert.equal(holdingResult({ ...base, watched: false, settledAt: null, now: 10_001 }), false, 'a reload of a finished case shows the result at once');
  assert.equal(holdingResult({ ...base, lines: 0, settledAt: null, now: 10_001 }), false, 'nothing to read: no hold');
  assert.equal(holdingResult({ ...base, outcomeAt: null, settledAt: null, now: 10_001 }), false, 'no result yet: nothing to hold');
  assert.equal(holdingResult({ ...base, settledAt: null, now: 10_000 + MAX_HOLD_MS }), false, 'a result is never held back for long');
});
