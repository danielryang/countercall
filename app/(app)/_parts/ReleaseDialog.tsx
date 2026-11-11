'use client';
// The human-approval moment, as Ramp's approval drawer: a right-hand panel over a whitewashed page, the facts in sections, the approver, and a sticky
// footer with "Keep on hold" and the press-and-hold release. Nothing is optimistic: the drawer closes when the SERVER confirms, and the screen changes
// only when the payment.released event arrives through the normal event stream.
import { useEffect, useState, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/shadcn/sheet';
import { Avatar } from '@/components/ui/Avatar';
import { HoldButton } from '@/components/ui/HoldButton';
import { plainTask, REASON_TEXT, STAMP } from '@/lib/copy';
import type { ReleaseDestination } from '@/lib/events';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

const NOTE_MIN = 10;
const OPTIONS: Record<string, { value: ReleaseDestination; label: string; hint: string }> = {
  on_file: { value: 'on_file', label: 'Pay the account we already have on file', hint: 'The safe choice. The new bank details in the email are ignored.' },
  new: { value: 'new_account_pending_ramp_approval', label: 'Approve the new bank account', hint: 'Ramp still has to approve the new account on its side.' },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-t border-rule px-8 py-6"><h3 className="pb-3 text-[20px] font-[450] leading-7">{title}</h3>{children}</section>;
}
function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-4 py-1.5 text-[15px] leading-[22px]"><dt className="text-fg-muted">{k}</dt><dd className="min-w-0">{children}</dd></div>;
}
const field = 'w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-[15px] placeholder:text-fg-muted focus:border-fg focus:outline-none';

export function ReleaseDialog({ c, open, onOpenChange, onDone, readOnly = false }: { c: CaseView; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; /** a replay: show what would happen, release nothing */ readOnly?: boolean }) {
  const [me, setMe] = useState<string | null | undefined>(undefined);   // undefined = checking
  const [passcode, setPasscode] = useState(''); const [name, setName] = useState('');
  const [dest, setDest] = useState<ReleaseDestination>('on_file'); const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(null); setNote(''); setDest('on_file'); setMe(undefined);
    if (readOnly) { setMe(null); return; }
    fetch('/api/auth', { cache: 'no-store' }).then(async (r) => setMe(r.ok ? ((await r.json()) as { name: string }).name : null)).catch(() => setMe(null));
  }, [open, readOnly]);

  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  const override = c.state === 'needs_human';
  const choices = c.state === 'fraud_blocked' ? [OPTIONS.on_file] : [OPTIONS.on_file, OPTIONS.new];
  const o = c.call?.outcome;
  const why = o ? REASON_TEXT[o.decision.reason].rule : plainTask(c.tasks.find((t) => t.status === 'open')?.reason ?? 'No call result');
  const result = o ? STAMP[o.decision.outcome].word : 'Needs a person';
  const noteOk = !override || note.trim().length >= NOTE_MIN;
  const vendor = c.vendorName ?? 'the vendor';

  const signIn = async () => {
    setBusy(true); setErr(null);
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode, name }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) { setMe(name); setPasscode(''); } else setErr(r?.status === 429 ? 'Too many attempts. Try again in a few minutes.' : 'That passcode or name was not accepted.');
  };
  const release = async () => {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/cases/${encodeURIComponent(c.id)}/release`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ destination: c.state === 'fraud_blocked' ? 'on_file' : dest, note: note.trim() || undefined }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) { onOpenChange(false); onDone(); return; }
    const j = r ? ((await r.json().catch(() => null)) as { reason?: string } | null) : null;
    setErr(j?.reason ?? 'Could not reach the server. Nothing was released.');
  };

  return (
    <Sheet open={open} onOpenChange={(o2) => !busy && onOpenChange(o2)}>
      <SheetContent side="right" className="gap-0 border-rule bg-surface p-0 text-fg data-[side=right]:w-[600px] data-[side=right]:sm:max-w-[600px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <header className="px-8 pb-6 pt-8">
            <SheetTitle className="text-[32px] font-[450] leading-10 tracking-[-0.01em] text-fg">Release {fmtCents(cents)}</SheetTitle>
            <SheetDescription className="mt-1 text-[15px] text-fg-muted">{vendor} {'·'} <span className="font-mono">{c.id}</span> {'·'} <span className="text-banner-ink">Waiting for a person</span></SheetDescription>
            <p className="mt-4 text-[15px] leading-[22px]">This is the only step that moves money. It needs a person; CounterCall never does it on its own.</p>
            {readOnly && <p className="mt-4 rounded-sm border border-rule-strong bg-surface-raised px-4 py-3 text-[15px] leading-[22px]">This is a replay of a recorded case, so nothing can be released here. In the live app, the signed-in person approves from this panel.</p>}
          </header>

          <Section title="Payment">
            <dl>
              <Row k="Amount"><span className="font-mono">{fmtCents(cents)}</span> <span className="text-fg-muted">({c.payments.length} invoice{c.payments.length === 1 ? '' : 's'})</span></Row>
              <Row k="Vendor">{vendor}</Row>
              <Row k="Call result">{result}. <span className="text-fg-muted">{why}.</span></Row>
            </dl>
          </Section>

          {(me || readOnly) && (
            <Section title="Where the money goes">
              <fieldset className="space-y-2">
                <legend className="sr-only">Where should the money go?</legend>
                {choices.map((opt) => {
                  const on = choices.length === 1 || dest === opt.value;
                  return (
                    <label key={opt.value} className={`flex cursor-pointer gap-3 rounded-sm border px-4 py-3 text-[15px] ${on ? 'border-fg' : 'border-rule-strong hover:border-fg-muted'}`}>
                      <input type="radio" name="dest" value={opt.value} checked={on} onChange={() => setDest(opt.value)} className="mt-1 accent-black" />
                      <span><span className="block font-[500]">{opt.label}</span><span className="text-[14px] text-fg-muted">{opt.hint}</span></span>
                    </label>
                  );
                })}
              </fieldset>
              {override && (
                <label className="mt-4 block text-[15px]"><span className="text-fg-muted">The call could not verify this. How did you verify it? ({NOTE_MIN}+ characters)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`mt-2 ${field}`} />
                </label>
              )}
            </Section>
          )}

          <Section title="Approval">
            {readOnly ? <p className="text-[15px] text-fg-muted">Replays are read-only.</p> : me ? (
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fg-muted text-[13px] font-[500] text-white">1</span>
                <span className="flex items-center gap-2 rounded-full border border-rule-strong py-1 pl-1 pr-3 text-[15px]"><Avatar name={me} size={24} />{me}</span>
                <span className="text-[14px] text-fg-muted">approving now</span>
              </div>
            ) : me === undefined ? <p className="text-[15px] text-fg-muted">Checking who is signed in{'…'}</p> : (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
                <p className="text-[15px] text-fg-muted">Sign in with the demo passcode to approve.</p>
                <input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
                <input aria-label="Passcode" placeholder="Passcode" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className={field} />
                <button type="submit" disabled={busy || !name.trim() || !passcode} className="btn btn-outline">{busy ? 'Checking…' : 'Sign in'}</button>
              </form>
            )}
          </Section>
          {err && <p role="alert" className="mx-8 mb-6 rounded-sm border border-blocked-rule bg-blocked-soft px-4 py-3 text-[15px] text-blocked">{err}</p>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-rule bg-surface px-8 py-4">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="btn btn-outline">{readOnly ? 'Close' : 'Keep on hold'}</button>
          <div className="flex items-center gap-3">
            <p className="text-[14px] text-fg-muted">Press and hold for a second</p>
            <HoldButton onConfirm={release} busy={busy} disabled={readOnly || !me || !noteOk}>Hold to release {fmtCents(cents)}</HoldButton>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
