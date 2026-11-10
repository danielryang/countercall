// video/src/timeline.ts: scene lengths for the Draft cut. Placeholder until the VO is locked (audio-first, 06 §6.5): then these come from VO marks.
export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const sec = (s: number) => Math.round(s * FPS);
export const TRANSITION = sec(0.5); // TransitionSeries subtracts each overlap from the total

export const SCENES = {
  problem: sec(10),
  stats: sec(13),
  architecture: sec(15),
  policy: sec(16),
  evalCard: sec(10),
  outro: sec(5),
} as const;
export type SceneId = keyof typeof SCENES;

const ORDER = Object.keys(SCENES) as SceneId[];
export const DRAFT_TOTAL = ORDER.reduce((n, id) => n + SCENES[id], 0) - TRANSITION * (ORDER.length - 1);
