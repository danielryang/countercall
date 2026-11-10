// Scene 5, detector eval. Every number comes from public/eval.json, written by `npx tsx eval/run.ts --json video/public/eval.json`.
// That file is a REPLAY run (each fixture's recorded extraction, no network) unless it says mode "live"; the label follows the file.
// The one live result shown is the README's, always with its date, model and N.
import { useCurrentFrame } from 'remotion';
import { Card } from '@/components/ui/Card';
import result from '../../public/eval.json';
import { Frame } from '../components/Frame';
import { progress, useRise } from '../motion';

const LIVE_README = { date: '2026-11-10', model: 'claude-haiku-5-5', n: 20, line: '20/20 correct · recall 12/12 · false positives 0/4' } as const;
const modeLabel = result.mode === 'live' ? `LIVE · ${result.model}` : result.mode === 'replay' ? 'REPLAY · recorded extractions' : result.mode.toUpperCase();

function Big({ at, value, label }: { at: number; value: string; label: string }) {
  return (
    <div style={useRise(at)} className="flex items-baseline gap-[40px]">
      <div className="w-[300px] shrink-0 font-mono text-[104px] font-semibold leading-none tabular-nums">{value}</div>
      <div className="text-[32px] text-fg-muted">{label}</div>
    </div>
  );
}

export function EvalCard() {
  const frame = useCurrentFrame();
  return (
    <Frame label="Detector eval" truth={`eval/run.ts --json · ${modeLabel}`}>
      <div className="grid h-full grid-cols-[1.2fr_1fr] gap-[48px] pb-[24px]">
        <Card className="justify-between px-[48px] py-[44px]">
          <div className="flex flex-col gap-[44px]">
            <Big at={6} value={`${result.pass}/${result.n}`} label="fixtures correct" />
            <Big at={18} value={`${result.recall.caught}/${result.recall.of}`} label="bank changes held" />
            <Big at={30} value={`${result.falsePositives.count}/${result.falsePositives.of}`} label="false alarms on normal mail" />
          </div>
          <div style={useRise(50)} className="flex flex-col gap-[14px] border-t border-rule pt-[28px]">
            <div className="font-mono text-[20px] uppercase tracking-[0.08em] text-fg-muted">Live run · {LIVE_README.date} · {LIVE_README.model}, N={LIVE_README.n}</div>
            <div className="text-[30px]">{LIVE_README.line}</div>
            <div className="text-[22px] text-fg-muted">N={result.n} hand-built emails. Not a general accuracy claim.</div>
          </div>
        </Card>
        <Card className="px-[8px] py-[8px]">
          <div className="flex items-center justify-between px-[20px] pb-[8px] pt-[16px] text-[24px]">
            <span className="font-semibold">Each fixture</span>
            <span className="font-mono text-[18px] text-fg-muted">{modeLabel}</span>
          </div>
          <div className="grid grid-cols-1 gap-[6px] px-[20px] py-[12px]">
            {result.rows.map((r, i) => {
              const p = progress(frame, 20 + i * 5, 10);
              return (
                <div key={r.id} className="flex items-center justify-between font-mono text-[18px] leading-[1.45]" style={{ opacity: p }}>
                  <span className="truncate pr-[16px]">{r.id}</span>
                  <span style={{ color: r.ok ? 'var(--color-verified)' : 'var(--color-blocked)' }}>{r.ok ? 'pass' : 'FAIL'}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </Frame>
  );
}
