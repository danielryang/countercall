'use client';
// Presenter controls: check readiness, pick a scenario (with the cheat-card for whoever plays Acme on the phone), send a test email, replay or
// step through a recorded run, reset between takes. Everything goes through the same routes and the same pipeline as real email.
// Injected emails are labelled SIMULATED: they skip the mail provider but run the real detection, holds and policy.
// The header chips are facts: the stage size is measured from this window, RAMP MOCK/SANDBOX and the allowlist count come from the server's env.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mark } from '@/components/ui/Mark';
import { PresentMode } from '@/components/ui/PresentMode';
import { cheatCards } from '@/lib/cheat';
import { INJECT_CONFIRM, STAGE_OK, stageOff } from '@/lib/copy';
import type { Check } from '@/lib/preflight';

const EMAILS = [
  { id: '01-obvious-bank-change-freemail', title: 'Fake bank change', note: 'Gmail sender, new bank details. Flagged, held and phoned.' },
  { id: '05-lookalike-domain-hyphen-tld', title: 'Lookalike domain', note: 'acme-corp.co, and every email check passes.' },
  { id: '12-prompt-injection-explicit', title: 'Tries to trick the AI', note: 'Tells the AI to mark it verified. The rules still hold the money.' },
  { id: '08-legit-bank-change', title: 'Real bank change', note: 'A known contact. Ends verified after the call.' },
  { id: '07-normal-invoice-no-change', title: 'Normal invoice', note: 'No change requested. Clears, nothing held.' },
  { id: '09-w9-request', title: 'Harmless request', note: 'A W-9 request. Clears.' },
];
const LEVEL = { ok: ['✓', 'text-verified'], warn: ['!', 'text-blaze-ink'], fail: ['✕', 'text-blocked'] } as const;
type Pre = { checks: Check[]; ready: boolean; fails: number; warns: number; rampMode?: 'mock' | 'sandbox'; callsEnabled?: boolean; allowedNumbers?: number };
type Line = { at: string; text: string };

const post = (url: string, body?: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const linkBtn = 'btn btn-outline btn-sm';

/** innerWidth x innerHeight of this window, so the presenter can size the recording window until the chip says OK (08 s1.6). */
function useStage(): [number, number] {
  const [s, setS] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const read = () => setS([window.innerWidth, window.innerHeight]);
    read(); window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return s;
}

export function DemoPanel() {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState(''); const [passcode, setPasscode] = useState(''); const [authErr, setAuthErr] = useState<string | null>(null);
  const [pre, setPre] = useState<Pre | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false); const [log, setLog] = useState<Line[]>([]);
  // A test email that gets flagged really rings the callee's phone when calls are on (it did once: CC-0110). Unless preflight says calls are
  // off, the first click only arms the send and says so; the second click sends. Fail closed: an unknown calls state also asks first.
  const [armed, setArmed] = useState<string | null>(null);
  const cards = useMemo(() => cheatCards(), []);
  const [pick, setPick] = useState<(typeof cards)[number]['name']>('denied');   // the hero take first
  const card = cards.find((c) => c.name === pick) ?? cards[0];
  const [w, h] = useStage();
  const say = (text: string) => setLog((l) => [{ at: new Date().toLocaleTimeString('en-US', { hour12: false }), text }, ...l].slice(0, 4));

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
    if (pre?.callsEnabled !== false && armed !== id) { setArmed(id); return; }
    setArmed(null); setBusy(id); say(`Sending "${title}"…`);
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

  const stageOk = w === 1280 && h === 720;
  return (
    <>
    <div data-app className="flex h-screen min-h-[720px] flex-col bg-surface text-fg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rule px-8">
        <Link href="/cases" className="flex items-center gap-2" aria-label="CounterCall case view"><Mark /><span className="text-[16px] font-[600] tracking-[-0.01em]">CounterCall</span></Link>
        <span className="text-[15px] text-fg-muted">/ Demo controls</span>
        <div data-present-hide className="ml-auto flex items-center gap-4 text-[14px] text-fg-muted">
          {me && <span>Signed in as <span className="text-fg">{me}</span></span>}
          <Link href="/cases" className="btn btn-outline btn-sm">Open the case view {'→'}</Link>
        </div>
      </header>

      {me === undefined && <p className="px-10 pt-8 text-[15px] text-fg-muted">Checking sign-in{'…'}</p>}
      {me === null && (
        <main className="grid flex-1 place-items-center p-8">
          <form className="w-full max-w-[400px] space-y-3" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
            <h1 className="display text-[32px] leading-10">Sign in to the demo controls</h1>
            <p className="pb-2 text-[15px] text-fg-muted">The presenter page. Every button here needs the passcode.</p>
            <input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-[15px] focus:border-fg focus:outline-none" />
            <input aria-label="Passcode" placeholder="Passcode" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-[15px] focus:border-fg focus:outline-none" />
            {authErr && <p role="alert" className="text-[14px] text-blocked">{authErr}</p>}
            <button type="submit" disabled={busy === 'auth' || !name.trim() || !passcode} className="btn w-full">{busy === 'auth' ? 'Checking…' : 'Sign in'}</button>
          </form>
        </main>
      )}
      {me && (
        <main className="flex min-h-0 flex-1 flex-col px-10 pt-6">
          <div data-present-hide className="flex shrink-0 flex-wrap items-center gap-2">
            <h1 className="display mr-4 text-[36px] leading-[42px]">Demo controls</h1>
            {w > 0 && <span className="chip" data-status={stageOk ? 'VERIFIED' : 'BLOCKED'} title="This window's inner size. Resize until it reads 1280×720 before recording.">{stageOk ? STAGE_OK : stageOff(w, h)}</span>}
            {pre?.rampMode && <span className="chip-plain" title="Payments are held in a stand-in for Ramp, never in Ramp itself.">{pre.rampMode === 'mock' ? 'RAMP MOCK' : 'RAMP SANDBOX'}</span>}
            {pre && pre.callsEnabled !== undefined && <span className={pre.callsEnabled ? 'chip' : 'chip-plain'} data-status={pre.callsEnabled ? 'HELD' : undefined}>{pre.callsEnabled ? 'Calls on: phones will ring' : 'Calls off'}</span>}
            {pre && pre.allowedNumbers !== undefined && <span className="chip-plain">{pre.allowedNumbers} callable number{pre.allowedNumbers === 1 ? '' : 's'}</span>}
          </div>
          <div data-present-solo className="mt-6 grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_360px] gap-10 pb-6">
            <div data-present-hide className="flex min-h-0 flex-col gap-8 overflow-y-auto">
              <section>
                <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
                  <h2 className="text-[20px] font-[500]">Ready to demo?</h2>
                  <button type="button" onClick={() => void loadPre()} className="text-[14px] text-fg-muted underline underline-offset-4 hover:text-fg" title="Run the checks again">Check again</button>
                </div>
                <p className="py-2 text-[14px] text-fg-muted">{pre ? (pre.ready ? (pre.warns ? `${pre.warns} to note` : 'All good') : `${pre.fails} to fix`) : 'Checking…'}</p>
                <ul className="space-y-2">
                  {pre?.checks.map((c) => (
                    <li key={c.id} className="flex gap-2.5 text-[14px] leading-5">
                      <span aria-hidden className={`w-3.5 shrink-0 text-center font-[600] ${LEVEL[c.level][1]}`}>{LEVEL[c.level][0]}</span>
                      <span><span className="font-[500]">{c.label}</span> <span className="text-fg-muted">{c.detail}</span></span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="border-b border-rule pb-2 text-[20px] font-[500]">Between takes</h2>
                <p className="pt-3 text-[14px] text-fg-muted">Archives live cases for a clean next take. Seeded history stays; nothing is deleted.</p>
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" disabled={busy !== null} onClick={() => void reset()} className="btn btn-outline btn-sm">{busy === 'reset' ? 'Resetting…' : confirmReset ? 'Click again to confirm' : 'Reset the demo'}</button>
                  {confirmReset && <button type="button" onClick={() => setConfirmReset(false)} className="text-[14px] text-fg-muted hover:text-fg">Cancel</button>}
                </div>
                <p className="mt-3 text-[14px] text-fg-muted">Press <kbd className="rounded border border-rule-strong px-1.5 text-[12px] text-fg">P</kbd> for present mode: bigger type, no footer, a ring on the cursor. <kbd className="rounded border border-rule-strong px-1.5 text-[12px] text-fg">Esc</kbd> leaves it.</p>
              </section>
            </div>

            <section className="flex min-h-0 flex-col">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[20px] font-[500]">Scenarios</h2>
                <span className="text-[14px] text-fg-muted">What the person on the phone says</span>
              </div>
              <div role="tablist" aria-label="Scenario" className="mt-2 flex shrink-0 flex-wrap gap-x-6 border-b border-rule">
                {cards.map((c) => (
                  <button key={c.name} type="button" role="tab" aria-selected={c.name === pick} onClick={() => setPick(c.name)}
                    className={`-mb-px border-b-2 pb-2.5 pt-1 text-[15px] ${c.name === pick ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>{c.title}</button>
                ))}
              </div>
              <div role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[22px] font-[450] leading-7">{card.title}</h3>
                    <p className="mt-0.5 text-[15px] text-fg-muted first-letter:uppercase">{card.describes}</p>
                  </div>
                  <span className="chip shrink-0" data-status={card.resultStatus}>Ends {card.resultWord.toLowerCase()}</span>
                </div>
                <p className="mt-4 text-[15px]">{card.tip}</p>
                <ol className="mt-4 space-y-2 border-l-2 border-rule pl-5">
                  {card.says.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[17px] leading-6">
                      <span className="w-4 shrink-0 text-[14px] leading-6 text-fg-muted">{i + 1}</span>
                      <span>{s.startsWith('(') ? <span className="text-fg-muted">{s}</span> : `“${s}”`}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[14px] text-fg-muted">Payments stay held in every scenario. Only a signed-in person can release them.</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  {card.run ? (<>
                    <Link href={`/cases?replay=${card.run}`} className={linkBtn}>Replay the recorded run {'→'}</Link>
                    <Link href={`/cases?replay=${card.run}&at=0`} className={linkBtn}>Step through it</Link>
                    {card.name === 'denied' && <Link href="/cases?replay=fraud-live" className={linkBtn}>Replay the real call</Link>}
                  </>) : <span className="text-[14px] text-fg-muted">No recorded run for this one. Send the fake bank change and play it live.</span>}
                </div>
              </div>
            </section>

            <div data-present-hide className="flex min-h-0 flex-col gap-6">
              <section className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
                  <h2 className="text-[20px] font-[500]">Send a test email</h2>
                  <span className="chip-plain">SIMULATED</span>
                </div>
                <p className="pt-2 text-[14px] text-fg-muted">Real detection, holds and policy. Only the mail delivery is skipped.</p>
                <ul className="min-h-0 flex-1 overflow-y-auto">
                  {EMAILS.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 border-b border-rule py-2.5">
                      <span className="min-w-0 flex-1"><span className="block text-[15px] font-[500]">{m.title}</span><span className="block text-[13px] leading-[18px] text-fg-muted">{m.note}</span></span>
                      <button type="button" disabled={busy !== null} onClick={() => void inject(m.id, m.title)} className={`btn btn-sm shrink-0 ${armed === m.id ? '' : 'btn-outline'}`}>{busy === m.id ? 'Sending…' : armed === m.id ? INJECT_CONFIRM : 'Send'}</button>
                      {armed === m.id && <button type="button" onClick={() => setArmed(null)} className="text-[14px] text-fg-muted hover:text-fg">Cancel</button>}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="shrink-0">
                <h2 className="border-b border-rule pb-2 text-[16px] font-[500]">What just happened</h2>
                <ul className="space-y-1 pt-2 text-[14px]" aria-live="polite">
                  {log.length === 0 && <li className="text-fg-muted">Nothing yet.</li>}
                  {log.map((l, i) => <li key={`${l.at}-${i}`} className="truncate" title={l.text}><span className="font-mono text-fg-muted">{l.at}</span> {l.text}</li>)}
                </ul>
              </section>
            </div>
          </div>
        </main>
      )}
    </div>
    <PresentMode theme="ramp" />
    </>
  );
}
