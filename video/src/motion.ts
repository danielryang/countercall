// video/src/motion.ts: frame-driven versions of the app's motion tokens (app/globals.css --ease-out, --ease-snap). No springs, no bounce.
import { Easing, interpolate, useCurrentFrame } from 'remotion';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1); // --ease-out
export const EASE_SNAP = Easing.bezier(0.2, 0, 0, 1); // --ease-snap

/** 0 -> 1 over `dur` frames starting at `at`, clamped, eased. */
export const progress = (frame: number, at: number, dur = 18, easing = EASE_OUT) =>
  interpolate(frame, [at, at + dur], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Entrance: fade + up to 8px of travel (the app's max). */
export function useRise(at: number, dur = 18) {
  const p = progress(useCurrentFrame(), at, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * 8}px)` } as const;
}
