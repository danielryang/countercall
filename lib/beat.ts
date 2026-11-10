/** Story-beat scheduler: backend events may arrive in a burst; animations must read as a sequence. */
export function makeBeats(gapMs = 700) {
  let free = 0; // ponytail: closure state, one per page; reset on system.reset
  return (now: number, durMs = gapMs): number => { const delay = Math.max(0, free - now); free = now + delay + durMs; return delay; };
}
