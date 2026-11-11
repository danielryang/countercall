// End card (script.md G2, 4:04-4:12, no VO): where to look next, and what is not real. Static on purpose; only the entrance moves.
import { Frame } from '../components/Frame';
import { useRise } from '../motion';

const LINKS = [
  { k: 'Live app', v: 'https://countercall-steel.vercel.app' },
  { k: 'Judges, start here', v: '/cases?replay=fraud' },
  { k: 'Code', v: 'github.com/danielryang/countercall' },
] as const;

export function EndCard() {
  return (
    <Frame label="Thanks for watching" truth="Ramp: mock · calls: consenting teammates only">
      <div className="flex h-full flex-col justify-between pb-[24px]">
        <div className="flex flex-col gap-[24px] pt-[80px]">
          <div style={useRise(0, 20)} className="display text-[150px] leading-none">CounterCall</div>
          <div style={useRise(10, 20)} className="text-[40px] text-fg-muted">Call the number you already have.</div>
        </div>
        <div className="flex items-end justify-between gap-[64px]">
          <div className="flex flex-col gap-[20px]">
            {LINKS.map((l, i) => (
              <div key={l.k} style={useRise(24 + i * 8, 18)} className="flex items-baseline gap-[28px]">
                <span className="w-[300px] shrink-0 text-[26px] text-fg-muted">{l.k}</span>
                <span className="font-mono text-[34px]">{l.v}</span>
              </div>
            ))}
          </div>
          <div style={useRise(56, 18)} className="flex max-w-[720px] flex-col items-end gap-[12px] text-right font-mono text-[20px] leading-[1.5] text-fg-muted">
            <span>Rice Robotics and Acme are fictional. No real money moves.</span>
            <span>The agent says it is automated in its first sentence.</span>
            <span>Daniel Yang · Eric Kim · Saketh Korada</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}
