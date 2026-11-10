// Title card (script.md A4, 0:31-0:35, VO "So we automated the call."): the wordmark and the promise. No numbers here.
import { useCurrentFrame } from 'remotion';
import { Frame } from '../components/Frame';
import { progress, useRise } from '../motion';

export function Title() {
  const rule = progress(useCurrentFrame(), 16, 30);
  return (
    <Frame label="BBS x Ramp · Automate the Old Way" truth="Fictional customer · fictional vendor">
      <div className="flex h-full flex-col items-start justify-center gap-[36px] pb-[60px] pl-[40px]">
        <div style={useRise(0, 20)} className="display text-[176px] leading-none">CounterCall</div>
        <div className="h-px bg-fg" style={{ width: `${rule * 900}px`, opacity: 0.4 }} />
        <div style={useRise(18, 20)} className="text-[44px] text-fg-muted">Call the number you already have.</div>
        <div style={useRise(34, 20)} className="font-mono text-[22px] uppercase tracking-[0.12em] text-fg-muted">Email flagged · payments held · vendor called · a person decides</div>
      </div>
    </Frame>
  );
}
