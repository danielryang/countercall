// The landing page (/). Keyless: no DB, no API, no env. The call transcripts are read at build time from the recorded runs in public/runs
// (the same files /cases?replay= plays), so the page shows what the pipeline actually produced, labelled by provenance.
import type { Metadata } from 'next';
import { REASON_TEXT } from '@/lib/copy';
import type { CaseState } from '@/lib/events';
import { fmtCents } from '@/lib/selectors';
import type { Reason } from '@/lib/voice/decide';
import type { Outcome } from '@/components/landing/CallOutcomes';
import { Footer, Hero, HowItWorks, Nav, Problem, Ramp, TheCall, Trust } from '@/components/landing/Sections';
import recorded from '@/public/runs/fraud-live.json';   // = RECORDED_RUN in components/landing/copy.ts; a missing file fails the build
import confirmed from '@/public/runs/confirmed.json';
import vague from '@/public/runs/vague.json';

export const metadata: Metadata = {
  title: 'CounterCall',
  description: 'Call the number you already have. CounterCall holds payments on a vendor bank-change email and phones the vendor on the number already on file.',
};

interface RunEvent { type: string; payload: Record<string, unknown> }
interface Run { events: RunEvent[] }

const MONEY: Partial<Record<CaseState, (amount: string) => string>> = {
  fraud_blocked: (a) => `${a} stays on hold. The bank change is rejected.`,
  awaiting_approval: (a) => `${a} stays on hold until a person approves the release.`,
  needs_human: (a) => `${a} stays on hold. A person gets a task.`,
};

function outcomeOf(run: Run, key: string, tab: string, provenance: string): Outcome {
  const ev = run.events;
  const final = ev.filter((e) => e.type === 'call.transcript.delta' && e.payload.final).at(-1);
  const items = (final?.payload.items ?? []) as { role: string; text: string }[];
  const turns = items.filter((t) => t.text.trim()).map((t) => ({ role: t.role === 'agent' ? 'agent' as const : 'user' as const, text: t.text.trim() }));
  const decision = (ev.find((e) => e.type === 'call.outcome')?.payload.decision ?? {}) as { reason?: Reason };
  const state = (ev.filter((e) => e.type === 'case.state').at(-1)?.payload.to ?? 'needs_human') as CaseState;
  const bills = (ev.find((e) => e.type === 'payment.held')?.payload.bills ?? []) as { amountCents: number }[];
  const amount = fmtCents(bills.reduce((s, b) => s + b.amountCents, 0));
  return { key, tab, provenance, state, turns, reason: decision.reason ? REASON_TEXT[decision.reason].rule : 'No result recorded', money: (MONEY[state] ?? MONEY.needs_human!)(amount) };
}

const OUTCOMES: Outcome[] = [
  outcomeOf(recorded as Run, 'no', 'Vendor says no', 'Recorded real call, 2026-11-10 · transcript as captured'),
  outcomeOf(confirmed as Run, 'yes', 'Vendor confirms', 'Scripted vendor lines, run through the real pipeline · digits masked'),
  outcomeOf(vague as Run, 'unsure', '“I think so?”', 'Scripted vendor lines, run through the real pipeline'),
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-surface text-fg">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <TheCall outcomes={OUTCOMES} />
        <Trust />
        <Ramp />
      </main>
      <Footer />
    </div>
  );
}
