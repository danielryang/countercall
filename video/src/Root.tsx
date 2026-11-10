// video/src/Root.tsx: every composition at 1920x1080, 30 fps, all timed from timeline.ts (which mirrors docs/video/script.md).
// `Technical` is beat F (55 s). `Draft` stitches every Remotion scene in cut order (no screen recordings). Each scene is also its own
// composition so one can be iterated on alone (`npx remotion still src/index.ts Policy out/policy.png --frame=60`).
import './index.css';
import './fonts';
import type { FC } from 'react';
import { AbsoluteFill, Composition, Folder } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { DRAFT, FPS, H, MARKS, SCENES, TECHNICAL, THEME, TRANSITION, W, series, type SceneId } from './timeline';
import { Problem } from './scenes/Problem';
import { Stats } from './scenes/Stats';
import { Title } from './scenes/Title';
import { Architecture } from './scenes/Architecture';
import { Policy } from './scenes/Policy';
import { EvalCard } from './scenes/EvalCard';
import { Assurance } from './scenes/Assurance';
import { Outro } from './scenes/Outro';
import { EndCard } from './scenes/EndCard';

const SCENE: Record<SceneId, { id: string; C: FC }> = {
  problem: { id: 'Problem', C: Problem },
  stats: { id: 'Stats', C: Stats },
  title: { id: 'Title', C: Title },
  architecture: { id: 'Architecture', C: Architecture },
  policy: { id: 'Policy', C: Policy },
  evalCard: { id: 'Eval', C: EvalCard },
  assurance: { id: 'Assurance', C: Assurance },
  outro: { id: 'Outro', C: Outro },
  endCard: { id: 'EndCard', C: EndCard },
};
const T = linearTiming({ durationInFrames: TRANSITION });

/** Scenes back to back with a short fade; each scene starts on its mark (see series() in timeline.ts). */
function Series({ ids }: { ids: readonly SceneId[] }) {
  const { items } = series(ids);
  return (
    <AbsoluteFill data-theme={THEME} className="bg-surface">
      <TransitionSeries>
        {items.flatMap(({ id, frames }, i) => {
          const { C } = SCENE[id];
          const seq = <TransitionSeries.Sequence key={id} durationInFrames={frames}><C /></TransitionSeries.Sequence>;
          return i === 0 ? [seq] : [<TransitionSeries.Transition key={`${id}-t`} presentation={fade()} timing={T} />, seq];
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
}

const Technical: FC = () => <Series ids={TECHNICAL} />;
const Draft: FC = () => <Series ids={DRAFT} />;

export const Root: FC = () => (
  <>
    <Composition id="Technical" component={Technical} durationInFrames={series(TECHNICAL).total} fps={FPS} width={W} height={H} />
    <Composition id="Draft" component={Draft} durationInFrames={series(DRAFT).total} fps={FPS} width={W} height={H} />
    <Folder name="scenes">
      {(Object.keys(MARKS) as SceneId[]).map((k) => <Composition key={k} id={SCENE[k].id} component={SCENE[k].C} durationInFrames={SCENES[k]} fps={FPS} width={W} height={H} />)}
    </Folder>
  </>
);
