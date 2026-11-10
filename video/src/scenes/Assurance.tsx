// Scene F4 (script.md 3:41-3:57): the system checks its own safety. Every number comes from ../facts.ts, which names the command
// that printed it; the command is shown under each card. Cards arrive in VO order: verifier, simulator, sealed log.
import type { ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';
import { Card } from '@/components/ui/Card';
import { Frame } from '../components/Frame';
import { FACTS, fmt } from '../facts';
import { progress, useRise } from '../motion';
import { sec } from '../timeline';

const AT = { verifier: 6, sim: sec(5.2), audit: sec(10.6) };

function Panel({ at, title, source, children }: { at: number; title: string; source: string; children: ReactNode }) {
  const rule = progress(useCurrentFrame(), at + 10, 30);
  return (
    <div style={useRise(at, 18)} className="h-full">
      <Card className="h-full justify-between px-[40px] py-[40px]">
        <div className="flex flex-col gap-[30px]">
          <div className="text-[28px] text-fg-muted">{title}</div>
          {children}
        </div>
        <div className="flex flex-col gap-[20px]">
          <div className="h-px bg-fg" style={{ width: `${rule * 100}%`, opacity: 0.4 }} />
          <div className="font-mono text-[20px] text-fg-muted">$ {source}</div>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[20px] font-mono text-[22px]">
      <span className="text-fg-muted">{k}</span><span className="tabular-nums">{v}</span>
    </div>
  );
}

/** The seal as a picture: each entry carries the seal of the one before it. Communicates "linked in order"; draws left to right. */
function Chain({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <div className="flex items-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const p = progress(frame, at + i * 6, 12);
        return (
          <div key={i} className="flex items-center" style={{ opacity: p }}>
            {i ? <div className="h-[2px] w-[22px] bg-fg" style={{ opacity: 0.5 }} /> : null}
            <div className="flex h-[52px] w-[64px] items-center justify-center rounded-md border border-rule bg-surface font-mono text-[18px] text-fg-muted">#{i + 1}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Assurance() {
  const frame = useCurrentFrame();
  const v = FACTS.verifier, s = FACTS.sim, a = FACTS.audit;
  const count = progress(frame, AT.verifier, 40);
  return (
    <Frame label="It checks its own safety" truth="Every number printed by the command under it">
      <div className="grid h-full grid-cols-3 gap-[40px] pb-[24px]">
        <Panel at={AT.verifier} title="Every policy input, enumerated" source={v.source}>
          <div className="flex flex-col gap-[12px]">
            <div className="font-mono text-[76px] font-semibold leading-none tabular-nums">{fmt(Math.round(v.total * count))}</div>
            <div className="text-[30px] leading-[1.35]">policy cases checked, offline<br /><span className="font-semibold">{v.unsafe} unsafe releases</span></div>
          </div>
          <div className="flex flex-col gap-[10px] border-t border-rule pt-[22px]">
            {v.rows.map((r) => <Row key={r.fn} k={r.fn} v={fmt(r.cases)} />)}
          </div>
        </Panel>
        <Panel at={AT.sim} title="Webhooks lost, repeated, forged" source={s.source}>
          <div className="flex flex-col gap-[12px]">
            <div className="font-mono text-[76px] font-semibold leading-none tabular-nums">{fmt(s.seeds)} seeds</div>
            <div className="text-[30px] leading-[1.35]">simulated offline on PGlite<br /><span className="font-semibold">{s.line}</span></div>
          </div>
          <div className="flex flex-col gap-[10px] border-t border-rule pt-[22px]">
            <Row k="calls" v={fmt(s.calls)} />
            <Row k="deliveries" v={fmt(s.deliveries)} />
            <Row k="forged requests" v={fmt(s.forged)} />
            <Row k="lost webhooks settled" v={fmt(s.reaped)} />
          </div>
          <div style={useRise(AT.sim + 40)} className="text-[24px] text-fg-muted">It has already found {s.bugs} real bugs, both fixed.</div>
        </Panel>
        <Panel at={AT.audit} title="The audit log is sealed" source={a.source}>
          <Chain at={AT.audit + 12} />
          <div className="flex flex-col gap-[18px] text-[28px] leading-[1.35]">
            <div style={useRise(AT.audit + 30)}>Each entry is locked to the one before it: <span className="font-semibold">chain intact</span>.</div>
            <div style={useRise(AT.audit + 44)}>Every case&apos;s status rebuilt from the log: <span className="font-mono font-semibold">{a.rebuilt[0]} of {a.rebuilt[1]}</span> match.</div>
            <div style={useRise(AT.audit + 58)} className="text-[22px] text-fg-muted">Production log, {a.date}. {fmt(a.beforeSeal)} earlier entries predate the seal. Tamper-evident, not tamper-proof.</div>
          </div>
        </Panel>
      </div>
    </Frame>
  );
}
