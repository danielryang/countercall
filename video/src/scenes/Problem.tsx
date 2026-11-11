// Scene 1, the problem: one forged email, one wire. Email text is the fictional Acme fixture the app's "fraud" run uses (CC-0105).
// Bank numbers are masked on screen, as in the app.
import { useCurrentFrame } from 'remotion';
import { Card } from '@/components/ui/Card';
import { Frame } from '../components/Frame';
import { progress, useRise } from '../motion';

const BODY_BEFORE = 'Hello Accounts Payable,\n\n';
const HOT_1 = 'We have changed banks.';
const BODY_MID = " Please send this month's payment for invoice 4471 ($12,400.00) to our ";
const HOT_2 = 'new account:';
const BODY_AFTER = '\n\nBank: Bluebird Neobank\nRouting number: •••••3913\nAccount number: ••••••••4321\n\nPlease confirm once your records are updated.\n\nThanks,\nAcme Corp Accounts Receivable';

function Marker({ at, children }: { at: number; children: string }) {
  const p = progress(useCurrentFrame(), at, 24);
  return (
    <span className="rounded-sm" style={{ backgroundImage: 'linear-gradient(color-mix(in oklab, var(--color-held) 30%, transparent), color-mix(in oklab, var(--color-held) 30%, transparent))', backgroundRepeat: 'no-repeat', backgroundSize: `${p * 100}% 100%`, borderBottom: `2px solid color-mix(in oklab, var(--color-held) ${p * 70}%, transparent)` }}>
      {children}
    </span>
  );
}

export function Problem() {
  const frame = useCurrentFrame();
  const wire = progress(frame, 200, 40);   // the wire moves on "the money goes to whoever sent it"
  return (
    <Frame label="The problem" truth="Fictional vendor · fictional email">
      <div className="grid h-full grid-cols-[1.15fr_1fr] gap-[64px]">
        <div style={useRise(0, 20)}>
          <Card className="h-full">
            <div className="flex flex-col gap-[14px] border-b border-rule px-[40px] py-[30px] text-[26px]">
              <div><span className="text-fg-muted">From </span>Acme Corp Billing <span className="font-mono text-[22px] text-fg-muted">&lt;acme.billing.dept@gmail.com&gt;</span></div>
              <div className="text-[34px] font-semibold">Important: Change of bank details</div>
            </div>
            <div className="whitespace-pre-wrap px-[40px] py-[30px] text-[26px] leading-[1.5]">
              {BODY_BEFORE}<Marker at={40}>{HOT_1}</Marker>{BODY_MID}<Marker at={70}>{HOT_2}</Marker>{BODY_AFTER}
            </div>
          </Card>
        </div>
        <div className="flex flex-col justify-center gap-[40px]">
          <div style={useRise(110, 20)} className="display text-[88px] leading-[0.95]">One email.<br />One wire.</div>
          <div style={useRise(140, 20)}>
            <Card>
              <div className="flex items-center justify-between px-[36px] py-[30px]">
                <div className="flex flex-col gap-[8px]">
                  <span className="text-[24px] text-fg-muted">Two Acme bills, scheduled Friday</span>
                  <span className="font-mono text-[56px] font-semibold tabular-nums">$24,800.00</span>
                </div>
                <div className="flex flex-col items-end gap-[8px]">
                  <span className="text-[24px] text-fg-muted">to the new account</span>
                  <span className="font-mono text-[28px]">Bluebird ••••4321</span>
                </div>
              </div>
              <div className="mx-[36px] mb-[30px] h-[6px] rounded-sm bg-surface-sunk">
                <div className="h-full rounded-sm" style={{ width: `${wire * 100}%`, background: 'var(--color-blocked)' }} />
              </div>
            </Card>
          </div>
          <div style={useRise(155, 20)} className="text-[30px] text-fg-muted">Same name, same invoice, new bank account. If AP pays it, the money goes to whoever sent the email.</div>
        </div>
      </div>
    </Frame>
  );
}
