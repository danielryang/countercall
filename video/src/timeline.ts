// video/src/timeline.ts: the ONE place scene timing lives. MARKS are absolute seconds in the final cut and match the beat table in
// docs/video/script.md (rows A1, A2, A4, F1-F4, G1, G2). When the VO is locked (audio-first, 06 §6.5), move the marks to the VO
// markers here and nowhere else; every composition below re-derives its length from them.
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const sec = (s: number) => Math.round(s * FPS);
export const TRANSITION = sec(0.5); // a fade between scenes in a series

/** The app theme the Remotion scenes render in. Keep it equal to THEME in docs/video/script.md (the team has not picked one yet). */
export const THEME: 'graphite' | 'paper' | 'cloud' = 'graphite';

/** [start, end] in seconds of the final cut (script.md). */
export const MARKS = {
  problem: [0, 10],        // A1
  stats: [10, 23],         // A2
  title: [31, 35],         // A4
  architecture: [182, 195], // F1  3:02-3:15
  policy: [195, 210],      // F2  3:15-3:30
  evalCard: [210, 221],    // F3  3:30-3:41
  assurance: [221, 237],   // F4  3:41-3:57
  outro: [237, 244],       // G1  3:57-4:04
  endCard: [244, 252],     // G2  4:04-4:12
} as const satisfies Record<string, readonly [number, number]>;
export type SceneId = keyof typeof MARKS;

/** Length of one scene on its own, in frames. */
export const lengthOf = (id: SceneId) => sec(MARKS[id][1] - MARKS[id][0]);
export const SCENES = Object.fromEntries((Object.keys(MARKS) as SceneId[]).map((id) => [id, lengthOf(id)])) as Record<SceneId, number>;

/**
 * Durations for a TransitionSeries so each scene STARTS exactly on its mark: every scene but the last is extended by one TRANSITION,
 * which the series then overlaps with the next scene. The series total equals the sum of the scene lengths.
 */
export function series(ids: readonly SceneId[]) {
  const items = ids.map((id, i) => ({ id, frames: lengthOf(id) + (i < ids.length - 1 ? TRANSITION : 0) }));
  const total = ids.reduce((n, id) => n + lengthOf(id), 0);
  return { items, total };
}

/** The technical segment (beat F, 3:02-3:57, 55 s): four scenes back to back. */
export const TECHNICAL = ['architecture', 'policy', 'evalCard', 'assurance'] as const satisfies readonly SceneId[];
/** Every Remotion scene in cut order. The draft leaves out the screen recordings, so it is shorter than the final cut. */
export const DRAFT = ['problem', 'stats', 'title', ...TECHNICAL, 'outro', 'endCard'] as const satisfies readonly SceneId[];

// Guard: the technical segment must stay contiguous and 55 s long, as the script says.
for (let i = 1; i < TECHNICAL.length; i++) {
  if (MARKS[TECHNICAL[i]][0] !== MARKS[TECHNICAL[i - 1]][1]) throw new Error(`timeline: ${TECHNICAL[i]} does not start where ${TECHNICAL[i - 1]} ends`);
}
if (MARKS.assurance[1] - MARKS.architecture[0] !== 55) throw new Error('timeline: the technical segment must be 55 s (script.md beat F)');
