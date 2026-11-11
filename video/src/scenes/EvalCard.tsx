// Scene 5, detector eval. Every number comes from public/eval.json, written by `npx tsx eval/run.ts --json video/public/eval.json`.
// That file is a REPLAY run (each fixture's recorded extraction, no network) unless it says mode "live"; the label follows the file.
// The live result and the rules-only result come from ../facts.ts (each names the command that printed it), always with date, model and N.
import { useCurrentFrame } from 'remotion';
import { Card } from '@/components/ui/Card';
import result from '../../public/eval.json';
import { Frame } from '../components/Frame';
import { progress, useRise } from '../motion';
import { FACTS } from '../facts';

const L = FACTS.evalLive, D = FACTS.evalRulesOnly;
const LIVE_LINE = `${L.pass}/${L.n} correct · recall ${L.recall[0]}/${L.recall[1]} · false positives ${L.falsePositives[0]}/${L.falsePositives[1]} · p50 ${L.p50s} s`;
const RULES_LINE = `Model off, rules only: ${D.pass}/${D.n}, every bank change still held (${D.recall[0]}/${D.recall[1]}); the ${D.benignToHuman} misses are normal emails sent to a person.`;
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
    <Frame label="Detector eval" truth={`${L.source} · list: ${modeLabel}`}>
      <div className="grid h-full grid-cols-[1.2fr_1fr] gap-[48px] pb-[24px]">
        <Card className="justify-between px-[48px] py-[44px]">
          <div className="flex flex-col gap-[44px]">
            <Big at={90} value={`${L.pass}/${L.n}`} label="fixtures correct, live" />
            <Big at={118} value={`${L.recall[0]}/${L.recall[1]}`} label="bank changes held" />
            <Big at={145} value={`${L.falsePositives[0]}/${L.falsePositives[1]}`} label="false alarms on normal mail" />
          </div>
          <div style={useRise(178)} className="flex flex-col gap-[14px] border-t border-rule pt-[28px]">   {/* the rules-only line lands on "With the model switched off" */}
            <div className="font-mono text-[20px] uppercase tracking-[0.08em] text-fg-muted">Live · {L.date} · {L.model} · N={L.n}</div>
            <div className="text-[30px]">{LIVE_LINE}</div>
            <div className="text-[22px] text-fg-muted">{RULES_LINE}</div>
            <div className="text-[22px] text-fg-muted">N={L.n} hand-built emails. Not a general accuracy claim.</div>
          </div>
        </Card>
        <Card className="px-[8px] py-[8px]">
          <div className="flex items-center justify-between px-[20px] pb-[8px] pt-[16px] text-[24px]">
            <span className="font-semibold">Each fixture</span>
            <span className="font-mono text-[18px] text-fg-muted">{modeLabel}</span>
          </div>
          <div className="grid grid-cols-1 gap-[6px] px-[20px] py-[12px]">
            {result.rows.map((r, i) => {
              const p = progress(frame, 90 + i * 4, 10);   // the per-fixture list fills in with "twenty out of twenty"
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
