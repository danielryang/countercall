// Scene 4, policy: REAL source lines from lib/policy/lifecycle.ts and lib/voice/decide.ts, read at build time by
// scripts/policy-excerpts.mjs into public/policy.json (located by marker text; the script fails if the code changes shape). Never paraphrase here.
import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chip } from '@/components/ui/Chip';
import { Stamp } from '@/components/call/Stamp';
import type { CaseView } from '@/lib/reducer';
import policy from '../../public/policy.json';
import { Frame } from '../components/Frame';
import { progress, useRise } from '../motion';

type Excerpt = (typeof policy.excerpts)[number];
const byId = (id: string) => {
  const x = policy.excerpts.find((e) => e.id === id);
  if (!x) throw new Error(`policy.json has no excerpt ${id}; run npm run data`);
  return x;
};
// Stamp renders only from a call outcome; this is a labelled illustration of the component, not a recorded case.
const verified = { call: { outcome: { decision: { outcome: 'CONFIRMED_LEGIT' } } } } as unknown as CaseView;

function Code({ x }: { x: Excerpt }) {
  const frame = useCurrentFrame();
  return (
    <div className="rounded-xl border border-rule bg-surface-raised">
      <div className="flex items-center justify-between border-b border-rule px-[32px] py-[18px] font-mono text-[20px] text-fg-muted">
        <span>{x.file}:{x.startLine}-{x.startLine + x.lines.length - 1}</span>
        <span>{policy.commit ? `excerpt at ${policy.commit}` : 'excerpt'}</span>
      </div>
      <pre className="m-0 px-[16px] py-[20px] font-mono text-[25px] leading-[1.6]">
        {x.lines.map((l, i) => {
          const hot = x.hot.includes(i);
          const p = hot ? progress(frame, 40 + x.hot.indexOf(i) * 20, 16) : 0;
          const c = l.indexOf('//');
          return (
            <div key={i} className="flex rounded-md" style={{ background: `color-mix(in oklab, var(--color-verified) ${p * 18}%, transparent)` }}>
              <span className="w-[72px] shrink-0 select-none pr-[20px] text-right text-fg-muted">{x.startLine + i}</span>
              <span className="whitespace-pre">{c >= 0 ? <>{l.slice(0, c)}<span className="text-fg-muted">{l.slice(c)}</span></> : l || ' '}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

function Panel({ x, lead, aside }: { x: Excerpt; lead: string; aside: ReactNode }) {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const out = 1 - progress(frame, durationInFrames - 12, 12);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div className="flex h-full flex-col gap-[36px]">
        <div style={useRise(0)} className="flex items-end justify-between gap-[40px]">
          <div className="flex flex-col gap-[10px]">
            <div className="text-[24px] text-fg-muted">{x.title}</div>
            <div className="display text-[60px]">{lead}</div>
          </div>
          <div className="shrink-0 pb-[6px]">{aside}</div>
        </div>
        <div style={useRise(10)}><Code x={x} /></div>
      </div>
    </AbsoluteFill>
  );
}

export function Policy() {
  const { durationInFrames } = useVideoConfig();
  const third = Math.floor(durationInFrames / 3);
  return (
    <Frame label="Code decides, not the model" truth="Real source · read at build time">
      <Sequence durationInFrames={third} layout="none">
        <Panel x={byId('nextState')} lead="A new outcome that is not handled will not compile."
          aside={<div className="flex gap-[12px]" style={{ zoom: 2 }}><Chip state="awaiting_approval" /><Chip state="fraud_blocked" /><Chip state="needs_human" /></div>} />
      </Sequence>
      <Sequence from={third} durationInFrames={third} layout="none">
        <Panel x={byId('decideOutcome')} lead="Right digits, no red flags, a second reader agrees."
          aside={<div style={{ zoom: 2 }}><Stamp c={verified} /></div>} />
      </Sequence>
      <Sequence from={third * 2} durationInFrames={durationInFrames - third * 2} layout="none">
        <Panel x={byId('canRelease')} lead="Even then, only a signed-in person releases money."
          aside={<div style={{ zoom: 2 }}><Chip state="held" /></div>} />
      </Sequence>
    </Frame>
  );
}
