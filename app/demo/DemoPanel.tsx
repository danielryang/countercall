'use client';
// Presenter controls: check readiness, send a test email, reset between takes. Everything here goes through the same routes and the same pipeline as real email.
// Injected emails are labelled SIMULATED: they skip the mail provider but run the real detection, holds and policy.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { Check } from '@/lib/preflight';

const EMAILS = [
  { id: '01-obvious-bank-change-freemail', title: 'Fake bank change', note: 'The classic: a Gmail address, "we have changed banks". Gets flagged, held and phoned.' },
  { id: '05-lookalike-domain-hyphen-tld', title: 'Lookalike domain', note: 'acme-corp.co instead of acmecorp.com, and every email check passes.' },
  { id: '12-prompt-injection-explicit', title: 'Tries to trick the AI', note: 'The email tells the AI to mark it verified. Fixed rules still hold the money.' },
  { id: '08-legit-bank-change', title: 'Real bank change', note: 'A genuine change from a known contact. Should end verified after the call.' },
  { id: '07-normal-invoice-no-change', title: 'Normal invoice', note: 'No change requested. Should clear with nothing held.' },
  { id: '09-w9-request', title: 'Harmless request', note: 'A W-9 request. Should clear.' },
];
const RUNS = [['fraud', 'Blocked'], ['confirmed', 'Verified'], ['voicemail', 'Voicemail'], ['vague', 'Vague answer'], ['impostor', 'Impostor'], ['fraud-live', 'Real call, recorded']];
const LEVEL = { ok: ['✓', 'text-verified'], warn: ['!', 'text-held'], fail: ['✕', 'text-blocked'] } as const;
type Pre = { checks: Check[]; ready: boolean; fails: number; warns: number };
type Line = { at: string; text: string };

const post = (url: string, body?: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const btn = 'rounded-lg border border-fg px-3 py-1.5 text-[13px] enabled:hover:bg-fg enabled:hover:text-surface disabled:border-rule disabled:text-fg-muted';

export function DemoPanel() {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState(''); const [passcode, setPasscode] = useState(''); const [authErr, setAuthErr] = useState<string | null>(null);
  const [pre, setPre] = useState<Pre | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false); const [log, setLog] = useState<Line[]>([]);
  const say = (text: string) => setLog((l) => [{ at: new Date().toLocaleTimeString('en-US', { hour12: false }), text }, ...l].slice(0, 8));

  const loadPre = useCallback(async () => {
    const r = await fetch('/api/demo/preflight', { cache: 'no-store' }).catch(() => null);
    if (r?.ok) setPre((await r.json()) as Pre); else say('Could not run the readiness check.');
  }, []);
  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' }).then(async (r) => setMe(r.ok ? ((await r.json()) as { name: string }).name : null)).catch(() => setMe(null));
  }, []);
  useEffect(() => { if (me) void loadPre(); }, [me, loadPre]);

  const signIn = async () => {
    setBusy('auth'); setAuthErr(null);
    const r = await post('/api/auth', { passcode, name }).catch(() => null);
    setBusy(null);
    if (r?.ok) { setMe(name); setPasscode(''); } else setAuthErr(r?.status === 429 ? 'Too many attempts. Try again in a few minutes.' : 'That passcode or name was not accepted.');
  };
  const inject = async (id: string, title: string) => {
    setBusy(id); say(`Sending "${title}"…`);
    const r = await post('/api/demo/inject', { fixtureId: id }).catch(() => null);
    const j = r ? ((await r.json().catch(() => null)) as { caseId?: string | null; error?: string } | null) : null;
    setBusy(null);
    say(r?.ok ? (j?.caseId ? `"${title}" became case ${j.caseId}. Open the case view to watch it.` : `"${title}" was already seen, so no new case.`) : `Could not send it (${j?.error ?? r?.status ?? 'no connection'}).`);
    void loadPre();
  };
  const reset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false); setBusy('reset');
    const r = await post('/api/demo/reset').catch(() => null);
    setBusy(null); say(r?.ok ? 'Reset: live cases archived, seeded history kept, call limits cleared.' : 'Reset failed. Nothing was changed.');
    void loadPre();
  };

  return (
    <div data-app data-theme="graphite" className="min-h-screen bg-surface text-fg">
      <header className="flex h-12 items-center gap-4 border-b border-rule px-5">
        <Link href="/cases" className="display text-[14px] uppercase">CounterCall</Link>
        <span className="cap">Demo controls</span>
        <Link href="/cases" className="ml-auto text-[13px] text-fg-muted hover:text-fg">Open the case view {'→'}</Link>
      </header>
      <main className="mx-auto grid max-w-[1080px] gap-4 px-5 py-6 md:grid-cols-2">
        {me === undefined && <p className="cap md:col-span-2">Checking sign-in{'…'}</p>}
        {me === null && (
          <Card title="Sign in" className="md:col-span-2 max-w-[420px]">
            <form className="space-y-2 px-5 pb-5" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
              <input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
              <input aria-label="Passcode" placeholder="Passcode" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
              {authErr && <p role="alert" className="text-[13px] text-blocked">{authErr}</p>}
              <button type="submit" disabled={busy === 'auth' || !name.trim() || !passcode} className={btn}>{busy === 'auth' ? 'Checking…' : 'Sign in'}</button>
            </form>
          </Card>
        )}
        {me && (<>
          <Card title="Ready to demo?" aside={pre ? (pre.ready ? (pre.warns ? `${pre.warns} to note` : 'All good') : `${pre.fails} to fix`) : 'Checking…'}>
            <ul className="space-y-2 px-5 pb-4 pt-2">
              {pre?.checks.map((c) => (
                <li key={c.id} className="flex gap-3 text-[14px]">
                  <span aria-hidden className={`w-4 shrink-0 text-center font-medium ${LEVEL[c.level][1]}`}>{LEVEL[c.level][0]}</span>
                  <span><span className="font-medium">{c.label}</span> <span className="text-fg-muted">{c.detail}</span></span>
                </li>
              ))}
            </ul>
            <div className="px-5 pb-5"><button type="button" onClick={() => void loadPre()} className={btn}>Check again</button></div>
          </Card>

          <Card title="Send a test email" aside="Simulated">
            <p className="cap px-5 pb-2">Runs the real detection, holds and policy. Only the mail delivery is skipped.</p>
            <ul className="divide-y divide-rule px-5 pb-3">
              {EMAILS.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{m.title}</span><span className="text-[12px] text-fg-muted">{m.note}</span></span>
                  <button type="button" disabled={busy !== null} onClick={() => void inject(m.id, m.title)} className={btn}>{busy === m.id ? 'Sending…' : 'Send'}</button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Between takes">
            <div className="space-y-3 px-5 pb-5 pt-1 text-[14px]">
              <p className="text-fg-muted">Resets the live cases so the next take starts clean. Seeded history stays. Nothing is deleted.</p>
              <div className="flex items-center gap-3">
                <button type="button" disabled={busy !== null} onClick={() => void reset()} className={btn}>{busy === 'reset' ? 'Resetting…' : confirmReset ? 'Click again to confirm' : 'Reset the demo'}</button>
                {confirmReset && <button type="button" onClick={() => setConfirmReset(false)} className="text-[13px] text-fg-muted hover:text-fg">Cancel</button>}
              </div>
            </div>
          </Card>

          <Card title="Recorded runs" aside="Replay">
            <p className="cap px-5 pb-2">Same screens, no phone or network needed. Always works.</p>
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              {RUNS.map(([id, label]) => <Link key={id} href={`/cases?replay=${id}&speed=1`} className={btn}>{label}</Link>)}
            </div>
          </Card>

          <Card title="What just happened" className="md:col-span-2">
            <ul className="space-y-1 px-5 pb-4 pt-1 text-[13px]" aria-live="polite">
              {log.length === 0 && <li className="text-fg-muted">Nothing yet. Signed in as {me}.</li>}
              {log.map((l, i) => <li key={`${l.at}-${i}`}><span className="font-mono text-fg-muted">{l.at}</span> {l.text}</li>)}
            </ul>
          </Card>
        </>)}
      </main>
    </div>
  );
}
