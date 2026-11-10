// The stage every scene sits on: the app's theme (THEME in timeline.ts), its tokens, and a quiet mono caption strip (scene label + truth label).
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { THEME } from '../timeline';

export function Frame({ label, truth, children }: { label: string; truth?: string; children: ReactNode }) {
  return (
    <AbsoluteFill data-video data-theme={THEME} className="bg-surface text-fg">
      <div className="absolute inset-x-[96px] top-[56px] flex items-center justify-between font-mono text-[20px] uppercase tracking-[0.14em] text-fg-muted">
        <span>CounterCall · {label}</span>
        {truth ? <span>{truth}</span> : null}
      </div>
      <div className="absolute inset-x-[96px] bottom-[72px] top-[128px]">{children}</div>
    </AbsoluteFill>
  );
}
