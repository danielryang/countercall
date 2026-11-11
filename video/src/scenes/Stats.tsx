// Scene 2, stat counters. ONLY the sourced stats from README.md "Sources", each with its citation on screen. Do not add a number here
// without adding its source to the README first.
import { useCurrentFrame } from 'remotion';
import { Card } from '@/components/ui/Card';
import { Frame } from '../components/Frame';
import { progress, useRise } from '../motion';

type Part = { value: (p: number) => string; line: string; delay?: number };   // delay: frames after the card, for a number said later in the line
type Stat = { at: number; parts: Part[]; source: string };
const STATS: Stat[] = [
  { at: 10, source: 'AFP 2026 Payments Fraud and Control Survey', parts: [
    { value: (p) => `${Math.round(74 * p)}%`, line: 'of organizations were affected by business email compromise in 2025' },
  ] },
  { at: 150, source: 'AFP 2026 Payments Fraud and Control Survey', parts: [
    { value: (p) => `${Math.round(30 * p)}%`, line: 'of companies hit by payments fraud recovered most of what they lost' },
    { value: (p) => `${Math.round(20 * p)}%`, line: 'recovered nothing', delay: 90 },   // "One in five got nothing" ~8.2 s
  ] },
  { at: 295, source: 'FBI IC3 2025 Annual Report', parts: [
    { value: (p) => `$${(3.05 * p).toFixed(2)}B`, line: 'in business email compromise losses reported to the FBI in 2025' },
  ] },
];

/** One number and its sentence. A part with a delay rises and counts on its own cue (the VO says it later). */
function PartView({ x, at, big }: { x: Part; at: number; big: boolean }) {
  const start = at + (x.delay ?? 0);
  const p = progress(useCurrentFrame(), start, 40);
  const rise = useRise(start, 18);   // always called: hooks must run in the same order every frame
  return (
    <div style={x.delay ? rise : undefined} className="flex flex-col gap-[16px]">
      <div className={`font-mono font-semibold leading-none tabular-nums ${big ? 'text-[120px]' : 'text-[104px]'}`}>{x.value(p)}</div>
      <div className="text-[30px] leading-[1.35]">{x.line}</div>
    </div>
  );
}

function StatCard({ s }: { s: Stat }) {
  const frame = useCurrentFrame();
  const rule = progress(frame, s.at + 10, 30);
  return (
    <div style={useRise(s.at, 18)} className="h-full">
      <Card className="h-full justify-between px-[44px] py-[44px]">
        <div className="flex flex-1 flex-col justify-center gap-[44px]">
          {s.parts.map((x) => <PartView key={x.line} x={x} at={s.at} big={s.parts.length === 1} />)}
        </div>
        <div className="flex flex-col gap-[24px]">
          <div className="h-px bg-fg" style={{ width: `${rule * 100}%`, opacity: 0.4 }} />
          <div className="font-mono text-[20px] uppercase tracking-[0.08em] text-fg-muted">Source: {s.source}</div>
        </div>
      </Card>
    </div>
  );
}

export function Stats() {
  return (
    <Frame label="How often this happens" truth="Sources in README.md">
      <div className="grid h-full grid-cols-3 gap-[40px] pb-[40px]">
        {STATS.map((s) => <StatCard key={s.source + s.at} s={s} />)}
      </div>
    </Frame>
  );
}
