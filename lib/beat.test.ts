import { makeBeats } from './beat.ts'; import assert from 'node:assert/strict';
const beat = makeBeats(700);
assert.equal(beat(1000), 0);          // first beat plays now
assert.equal(beat(1050), 650);        // burst: waits for the previous beat
assert.equal(beat(1060), 1340);       // third queues behind the second
assert.equal(beat(9000), 0);          // quiet period: no stale delay
console.log('beat ok');
