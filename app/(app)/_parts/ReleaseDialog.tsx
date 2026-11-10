'use client';
// The human-approval moment. Shows exactly what will happen, asks who is approving, and needs a press-and-hold. Nothing is optimistic: the dialog closes when the
// SERVER confirms, and the screen changes only when the payment.released event arrives through the normal event stream.
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { HoldButton } from '@/components/ui/HoldButton';
import { plainTask, REASON_TEXT } from '@/lib/copy';
import type { ReleaseDestination } from '@/lib/events';
import type { CaseView } from '@/lib/reducer';
import { fmtCents } from '@/lib/selectors';

const NOTE_MIN = 10;
const OPTIONS: Record<string, { value: ReleaseDestination; label: string; hint: string }> = {
  on_file: { value: 'on_file', label: 'Pay the account we already have on file', hint: 'The safe choice. The new bank details in the email are ignored.' },
  new: { value: 'new_account_pending_ramp_approval', label: 'Approve the new bank account', hint: 'Ramp still has to approve the new account on its side.' },
};

export function ReleaseDialog({ c, open, onOpenChange, onDone }: { c: CaseView; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [me, setMe] = useState<string | null | undefined>(undefined);   // undefined = checking
  const [passcode, setPasscode] = useState(''); const [name, setName] = useState('');
  const [dest, setDest] = useState<ReleaseDestination>('on_file'); const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const theme = typeof document === 'undefined' ? undefined : document.querySelector('[data-app]')?.getAttribute('data-theme') ?? undefined;   // the dialog renders in a portal, outside the themed tree

  useEffect(() => {
    if (!open) return;
    setErr(null); setNote(''); setDest('on_file'); setMe(undefined);
    fetch('/api/auth', { cache: 'no-store' }).then(async (r) => setMe(r.ok ? ((await r.json()) as { name: string }).name : null)).catch(() => setMe(null));
  }, [open]);

  const cents = c.payments.reduce((n, b) => n + b.amountCents, 0);
  const override = c.state === 'needs_human';
  const choices = c.state === 'fraud_blocked' ? [OPTIONS.on_file] : [OPTIONS.on_file, OPTIONS.new];
  const o = c.call?.outcome;
  const why = o ? REASON_TEXT[o.decision.reason].rule : plainTask(c.tasks.find((t) => t.status === 'open')?.reason ?? 'No call result');
  const noteOk = !override || note.trim().length >= NOTE_MIN;

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
    <Dialog open={open} onOpenChange={(o2) => !busy && onOpenChange(o2)}>
      <DialogContent data-theme={theme} className="max-w-[460px] border border-rule bg-surface-raised text-fg">
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold">Release the payments?</DialogTitle>
          <DialogDescription className="text-[13px] leading-5 text-fg-muted">This is the only step that moves money. It needs a person; CounterCall never does it on its own.</DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between gap-4"><dt className="text-fg-muted">Payments</dt><dd className="text-right"><span className="font-mono tabular-nums">{fmtCents(cents)}</span> <span className="text-fg-muted">to {c.vendorName} ({c.payments.length} invoices)</span></dd></div>
          <div className="flex justify-between gap-4"><dt className="text-fg-muted">What the call found</dt><dd className="text-right">{why}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-fg-muted">Approving as</dt><dd className="text-right">{me ?? <span className="text-fg-muted">{me === undefined ? 'checking\u2026' : 'not signed in'}</span>}</dd></div>
        </dl>

        {me === null && (
          <form className="space-y-2 rounded-lg border border-rule p-3" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
            <p className="text-[13px] text-fg-muted">Sign in with the demo passcode to approve.</p>
            <input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
            <input aria-label="Passcode" placeholder="Passcode" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
            <button type="submit" disabled={busy || !name.trim() || !passcode} className="rounded-md border border-fg px-3 py-1.5 text-[13px] disabled:border-rule disabled:text-fg-muted">{busy ? 'Checking\u2026' : 'Sign in'}</button>
          </form>
        )}

        {me && (
          <>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-[13px] text-fg-muted">Where should the money go?</legend>
              {choices.map((opt) => (
                <label key={opt.value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-[14px] ${dest === opt.value || choices.length === 1 ? 'border-fg' : 'border-rule'}`}>
                  <input type="radio" name="dest" value={opt.value} checked={choices.length === 1 || dest === opt.value} onChange={() => setDest(opt.value)} className="mt-1" />
                  <span><span className="block font-medium">{opt.label}</span><span className="text-[12px] text-fg-muted">{opt.hint}</span></span>
                </label>
              ))}
            </fieldset>
            {override && (
              <label className="block text-[13px]"><span className="text-fg-muted">The call could not verify this. How did you verify it? ({NOTE_MIN}+ characters)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
              </label>
            )}
          </>
        )}

        {err && <p role="alert" className="rounded-md border border-blocked/50 bg-blocked/15 px-3 py-2 text-[13px]">{err}</p>}
        <DialogFooter className="items-center gap-3 sm:justify-between">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="text-[13px] text-fg-muted hover:text-fg">Cancel</button>
          <div className="text-right">
            <HoldButton onConfirm={release} busy={busy} disabled={!me || !noteOk}>Hold to release {fmtCents(cents)}</HoldButton>
            <p className="cap mt-1">Press and hold for a second</p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
