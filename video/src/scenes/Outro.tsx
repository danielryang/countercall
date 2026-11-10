// Scene 6, outro: wordmark and the one-line promise. Ramp is labelled mock, as everywhere else.
import { Chip } from '@/components/ui/Chip';
import { Frame } from '../components/Frame';
import { useRise } from '../motion';

export function Outro() {
  return (
    <Frame label="Draft" truth="Ramp: mock · calls: consenting teammates only">
      <div className="flex h-full flex-col items-center justify-center gap-[40px] pb-[60px]">
        <div style={useRise(0, 20)} className="display text-[160px]">CounterCall</div>
        <div style={useRise(14, 20)} className="text-[40px] text-fg-muted">Call the number you already have.</div>
        <div style={{ ...useRise(30, 20), zoom: 2 }} className="flex gap-[10px]">
          <Chip state="flagged" /><Chip state="held" /><Chip state="calling" /><Chip state="fraud_blocked" />
        </div>
      </div>
    </Frame>
  );
}
