// Scene 3, architecture: the flow of 08 §4.2 (also the README diagram) as an animated React/SVG diagram. Edit NODES/EDGES here, not the VO.
// Coordinates are in the 1728x880 content box of <Frame>.
import { useCurrentFrame } from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { Frame } from '../components/Frame';
import { progress } from '../motion';

const BW = 250, BH = 120;
// Pace: the step times below are authored order, not frames. toFrame() places them on the F1 voiceover (docs/video/voiceover.md, read evenly over 13 s):
// email ~1 s, "signed webhook" ~3 s, the classifier ~4.3 s, "Retell places the call" ~7.2 s, "never reaches the dialer" ~11.5 s.
const ANCHORS: readonly (readonly [number, number])[] = [[0, 30], [18, 90], [36, 130], [104, 215], [124, 235], [144, 255], [312, 330], [340, 345]];
const toFrame = (at: number) => {
  for (let i = 1; i < ANCHORS.length; i++) {
    const [a0, f0] = ANCHORS[i - 1]; const [a1, f1] = ANCHORS[i];
    if (at <= a1) return f0 + ((at - a0) / (a1 - a0)) * (f1 - f0);
  }
  return ANCHORS[ANCHORS.length - 1][1];
};
type Node = { id: string; label: string; sub: string; x: number; y: number; at: number; kind?: 'outside' | 'store' };
const C = [0, 295, 590, 885, 1180, 1475];
const R = [0, 330, 660];
const NODES: Node[] = [
  { id: 'email', label: 'Inbound email', sub: 'AgentMail inbox', x: C[0], y: R[0], at: 0, kind: 'outside' },
  { id: 'hook', label: 'Email webhook', sub: 'Svix verified, raw body', x: C[1], y: R[0], at: 18 },
  { id: 'ingest', label: 'ingestEmail', sub: 'rules + Claude Haiku', x: C[2], y: R[0], at: 36 },
  { id: 'ramp', label: 'Ramp API', sub: 'RAMP MOCK · hold bills', x: C[1], y: R[1], at: 70, kind: 'outside' },
  { id: 'sink', label: 'appendEvent', sub: 'one writer, nextState', x: C[2], y: R[2], at: 76 },
  { id: 'call', label: 'startCall', sub: 'number on file only', x: C[3], y: R[0], at: 104 },
  { id: 'retell', label: 'Retell voice agent', sub: 'report-only tools', x: C[4], y: R[0], at: 124, kind: 'outside' },
  { id: 'vendor', label: 'Vendor phone', sub: 'on file · PSTN', x: C[5], y: R[0], at: 144, kind: 'outside' },
  { id: 'rhook', label: 'Call webhook', sub: 'signature verified', x: C[4], y: R[1], at: 172 },
  { id: 'finalize', label: 'finalizeCall', sub: 'decideOutcome()', x: C[3], y: R[1], at: 192 },
  { id: 'db', label: 'Postgres', sub: 'events append-only', x: C[3], y: R[2], at: 220, kind: 'store' },
  { id: 'ui', label: 'Browser UI', sub: 'reads /api/events', x: C[4], y: R[2], at: 240 },
  { id: 'human', label: 'Human approver', sub: 'passcode session', x: C[5], y: R[2], at: 262, kind: 'outside' },
  { id: 'release', label: 'Release route', sub: 'canRelease()', x: C[0], y: R[2], at: 290 },
];
const N = Object.fromEntries(NODES.map((n) => [n.id, n]));
const L = (id: string) => [N[id].x, N[id].y + BH / 2] as const;
const Rt = (id: string) => [N[id].x + BW, N[id].y + BH / 2] as const;
const T = (id: string) => [N[id].x + BW / 2, N[id].y] as const;
const B = (id: string) => [N[id].x + BW / 2, N[id].y + BH] as const;
const path = (...pts: (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');

type Edge = { d: string; at: number; label?: string; labelAt?: readonly [number, number] };
const EDGES: Edge[] = [
  { d: path(Rt('email'), L('hook')), at: 12 },
  { d: path(Rt('hook'), L('ingest')), at: 30 },
  { d: path([N.ingest.x + 30, N.ingest.y + BH], [N.ingest.x + 30, N.ramp.y + 60], Rt('ramp')), at: 62, label: 'hold', labelAt: [N.ingest.x + 42, 300] },
  { d: path(B('ingest'), T('sink')), at: 68 },
  { d: path(Rt('ingest'), L('call')), at: 96 },
  { d: path(Rt('call'), L('retell')), at: 116 },
  { d: path(Rt('retell'), L('vendor')), at: 136 },
  { d: path(B('retell'), T('rhook')), at: 164 },
  { d: path(L('rhook'), Rt('finalize')), at: 184 },
  { d: path(B('finalize'), [N.sink.x + BW, N.sink.y + 30]), at: 204 },
  { d: path(Rt('sink'), L('db')), at: 212 },
  { d: path(Rt('db'), L('ui')), at: 232 },
  { d: path(L('human'), Rt('ui')), at: 254 },
  { d: path(B('ui'), [B('ui')[0], 840], [B('release')[0], 840], B('release')), at: 276, label: 'hold to confirm' },
  { d: path(T('release'), B('ramp')), at: 304, label: 'release', labelAt: [170, 590] },
  { d: path(Rt('release'), L('sink')), at: 312 },
];
// The trust anchor: the phone number written in the email goes nowhere. The line stops short of startCall.
const LIE_Y = 200;
const LIE = path(B('email'), [B('email')[0], LIE_Y], [N.call.x - 40, LIE_Y]);
const LIE_AT = 340;

function EdgeView({ e }: { e: Edge }) {
  const frame = useCurrentFrame();
  const p = progress(frame, toFrame(e.at), 18);
  if (p <= 0) return null;
  const len = getLength(e.d);
  const mid = getPointAtLength(e.d, len / 2);
  const dot = getPointAtLength(e.d, len * p);
  return (
    <g>
      <path d={e.d} fill="none" stroke="var(--fg)" strokeOpacity={0.55} strokeWidth={2} markerEnd={p >= 1 ? 'url(#arrow)' : undefined} {...evolvePath(p, e.d)} />
      {p < 1 && dot ? <circle cx={dot.x} cy={dot.y} r={7} fill="var(--live)" /> : null}
      {e.label && mid && p >= 1 ?<text x={mid.x + 12} y={mid.y - 12} fill="var(--fg-muted)" fontFamily="var(--font-mono)" fontSize={18}>{e.label}</text> : null}
    </g>
  );
}

function NodeView({ n }: { n: Node }) {
  const p = progress(useCurrentFrame(), toFrame(n.at), 16);
  const border = n.kind === 'outside' ? 'border-dashed' : 'border-solid';
  return (
    <div className={`absolute flex flex-col justify-center gap-[8px] rounded-xl border border-rule ${border} ${n.kind === 'outside' ? 'bg-surface' : 'bg-surface-raised'} px-[22px]`}
      style={{ left: n.x, top: n.y, width: BW, height: BH, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
      <div className="text-[25px] font-semibold leading-tight">{n.label}</div>
      <div className="font-mono text-[17px] leading-tight text-fg-muted">{n.sub}</div>
    </div>
  );
}

export function Architecture() {
  const frame = useCurrentFrame();
  const lie = progress(frame, toFrame(LIE_AT), 24);
  const stop = progress(frame, toFrame(LIE_AT) + 24, 10);
  const end = [N.call.x - 40, LIE_Y] as const;
  return (
    <Frame label="How it works" truth="Next.js on Vercel · one app">
      <div className="relative h-[880px] w-[1728px]">
        <svg width={1728} height={880} className="absolute inset-0 overflow-visible">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg)" fillOpacity={0.55} />
            </marker>
          </defs>
          {EDGES.map((e, i) => <EdgeView key={i} e={e} />)}
          {lie > 0 ? (
            <g>
              <path d={LIE} fill="none" stroke="var(--color-blocked)" strokeWidth={3} {...(lie < 1 ? evolvePath(lie, LIE) : { strokeDasharray: '10 10' })} />
              <g opacity={stop} stroke="var(--color-blocked)" strokeWidth={4}>
                <path d={`M ${end[0] - 4} ${end[1] - 16} l 26 32 M ${end[0] + 22} ${end[1] - 16} l -26 32`} />
              </g>
              <text x={B('email')[0] + 16} y={LIE_Y - 12} opacity={stop} fill="var(--color-blocked)" fontFamily="var(--font-mono)" fontSize={18}>number in the email: never dialed</text>
            </g>
          ) : null}
        </svg>
        {NODES.map((n) => <NodeView key={n.id} n={n} />)}
      </div>
    </Frame>
  );
}
