// video/src/Root.tsx: every composition at 1920x1080, 30 fps. `Draft` stitches the scenes; each scene is also its own composition so one
// can be iterated on alone (`npx remotion still src/index.ts Policy out/policy.png --frame=60`).
import './index.css';
import './fonts';
import type { FC } from 'react';
import { AbsoluteFill, Composition, Folder } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { DRAFT_TOTAL, FPS, H, SCENES, TRANSITION, W, type SceneId } from './timeline';
import { Problem } from './scenes/Problem';
import { Stats } from './scenes/Stats';
import { Architecture } from './scenes/Architecture';
import { Policy } from './scenes/Policy';
import { EvalCard } from './scenes/EvalCard';
import { Outro } from './scenes/Outro';

const SCENE: Record<SceneId, { id: string; C: FC }> = {
  problem: { id: 'Problem', C: Problem },
  stats: { id: 'Stats', C: Stats },
  architecture: { id: 'Architecture', C: Architecture },
  policy: { id: 'Policy', C: Policy },
  evalCard: { id: 'Eval', C: EvalCard },
  outro: { id: 'Outro', C: Outro },
};
const ORDER = Object.keys(SCENES) as SceneId[];
const T = linearTiming({ durationInFrames: TRANSITION });

const Draft: FC = () => (
  <AbsoluteFill data-theme="graphite" className="bg-surface">
    <TransitionSeries>
      {ORDER.flatMap((k, i) => {
        const { C } = SCENE[k];
        const seq = <TransitionSeries.Sequence key={k} durationInFrames={SCENES[k]}><C /></TransitionSeries.Sequence>;
        return i === 0 ? [seq] : [<TransitionSeries.Transition key={`${k}-t`} presentation={fade()} timing={T} />, seq];
      })}
    </TransitionSeries>
  </AbsoluteFill>
);

export const Root: FC = () => (
  <>
    <Composition id="Draft" component={Draft} durationInFrames={DRAFT_TOTAL} fps={FPS} width={W} height={H} />
    <Folder name="scenes">
      {ORDER.map((k) => <Composition key={k} id={SCENE[k].id} component={SCENE[k].C} durationInFrames={SCENES[k]} fps={FPS} width={W} height={H} />)}
    </Folder>
  </>
);
