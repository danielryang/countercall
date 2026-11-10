'use client';
// Presenter controls: check readiness, pick a scenario (with the cheat-card for whoever plays Acme on the phone), send a test email, replay or
// step through a recorded run, reset between takes. Everything goes through the same routes and the same pipeline as real email.
// Injected emails are labelled SIMULATED: they skip the mail provider but run the real detection, holds and policy.
// The header chips are facts: the stage size is measured from this window, RAMP MOCK/SANDBOX and the allowlist count come from the server's env.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
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
const LEVEL = { ok: ['✓', 'text-verified'], warn: ['!', 'text-held'], fail: ['✕', 'text-blocked'] } as const;
const THEMES = ['graphite', 'paper', 'cloud'] as const;
type Theme = (typeof THEMES)[number];
type Pre = { checks: Check[]; ready: boolean; fails: number; warns: number; rampMode?: 'mock' | 'sandbox'; callsEnabled?: boolean; allowedNumbers?: number };
type Line = { at: string; text: string };

const post = (url: string, body?: unknown) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
const btn = 'rounded-lg border border-fg px-3 py-1.5 text-[13px] enabled:hover:bg-fg enabled:hover:text-surface disabled:border-rule disabled:text-fg-muted';
const linkBtn = 'rounded-lg border border-rule px-3 py-1.5 text-[13px] hover:border-fg';

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

function useTheme(): [Theme, (t: Theme) => void] {   // same rule as the app shell: ?theme= wins, then the last choice, then graphite
  const [theme, setThemeState] = useState<Theme>('graphite');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('theme'); let stored: string | null = null;
    try { stored = localStorage.getItem('cc-theme'); } catch { /* storage can be blocked */ }
    const pick = [q, stored].find((x): x is Theme => THEMES.includes(x as Theme));
    if (pick) setThemeState(pick);
  }, []);
  return [theme, (t) => { setThemeState(t); try { localStorage.setItem('cc-theme', t); } catch { /* ignore */ } }];
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
  const [w, h] = useStage(); const [theme, setTheme] = useTheme();
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
    <div data-app data-theme={theme} className="flex h-screen min-h-[720px] flex-col bg-surface text-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-rule px-5">
        <Link href="/cases" className="flex items-center gap-2.5" aria-label="CounterCall case view">
          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M6 0l6 6-6 6-6-6z" fill="currentColor" /></svg>
          <span className="display text-[14px] uppercase">CounterCall</span>
        </Link>
        <span className="cap mr-2">Demo controls</span>
        {w > 0 && <span className="chip" data-status={stageOk ? 'VERIFIED' : 'BLOCKED'} title="This window's inner size. Resize until it reads 1280×720 before recording.">{stageOk ? STAGE_OK : stageOff(w, h)}</span>}
        {pre?.rampMode && <span className="chip-plain font-mono" title="Payments are held in a stand-in for Ramp, never in Ramp itself.">{pre.rampMode === 'mock' ? 'RAMP MOCK' : 'RAMP SANDBOX'}</span>}
        {pre && pre.callsEnabled !== undefined && <span className="chip-plain" data-variant={pre.callsEnabled ? 'danger' : 'quiet'}>{pre.callsEnabled ? 'Calls on: phones will ring' : 'Calls off'}</span>}
        {pre && pre.allowedNumbers !== undefined && <span className="chip-plain" data-variant="quiet">{pre.allowedNumbers} callable number{pre.allowedNumbers === 1 ? '' : 's'}</span>}
        <div data-present-hide className="ml-auto flex items-center gap-4 text-[13px] text-fg-muted">
          {me && <span>Signed in as {me}</span>}
          <Link href="/cases" className="hover:text-fg">Open the case view {'→'}</Link>
        </div>
      </header>

      {me === undefined && <p className="cap p-5">Checking sign-in{'…'}</p>}
      {me === null && (
        <main className="grid flex-1 place-items-center p-5">
          <Card title="Sign in to the demo controls" className="w-full max-w-[400px]">
            <form className="space-y-2 px-5 pb-5 pt-2" onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
              <input aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
              <input aria-label="Passcode" placeholder="Passcode" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-[14px]" />
              {authErr && <p role="alert" className="text-[13px] text-blocked">{authErr}</p>}
              <button type="submit" disabled={busy === 'auth' || !name.trim() || !passcode} className={btn}>{busy === 'auth' ? 'Checking…' : 'Sign in'}</button>
            </form>
          </Card>
        </main>
      )}
      {me && (
        <main data-present-solo className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_360px] gap-4 p-4">
          <div data-present-hide className="flex min-h-0 flex-col gap-4">
            <Card title="Ready to demo?" className="min-h-0 flex-1"
              aside={<button type="button" onClick={() => void loadPre()} className="hover:text-fg hover:underline underline-offset-4" title="Run the checks again">{pre ? (pre.ready ? (pre.warns ? `${pre.warns} to note` : 'All good') : `${pre.fails} to fix`) : 'Checking…'} · Check again</button>}>
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 pb-4 pt-2">
                {pre?.checks.map((c) => (
                  <li key={c.id} className="flex gap-2.5 text-[13px] leading-[18px]">
                    <span aria-hidden className={`w-3 shrink-0 text-center font-medium ${LEVEL[c.level][1]}`}>{LEVEL[c.level][0]}</span>
                    <span><span className="font-medium">{c.label}</span> <span className="text-fg-muted">{c.detail}</span></span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Between takes">
              <div className="space-y-3 px-5 pb-4 pt-1 text-[13px]">
                <p className="text-fg-muted">Archives live cases for a clean next take. Seeded history stays; nothing is deleted.</p>
                <div className="flex items-center gap-3">
                  <button type="button" disabled={busy !== null} onClick={() => void reset()} className={btn}>{busy === 'reset' ? 'Resetting…' : confirmReset ? 'Click again to confirm' : 'Reset the demo'}</button>
                  {confirmReset && <button type="button" onClick={() => setConfirmReset(false)} className="text-[13px] text-fg-muted hover:text-fg">Cancel</button>}
                </div>
                <p className="cap">Press <kbd className="font-mono text-fg">P</kbd> for present mode: bigger type, no footer, a ring on the cursor. <kbd className="font-mono text-fg">Esc</kbd> leaves it.</p>
              </div>
            </Card>
          </div>

          <Card title="Scenarios" aside="What the person on the phone says" className="min-h-0">
            <div role="tablist" aria-label="Scenario" className="flex flex-wrap gap-1.5 px-5 pb-3 pt-2">
              {cards.map((c) => (
                <button key={c.name} type="button" role="tab" aria-selected={c.name === pick} onClick={() => setPick(c.name)}
                  className={`rounded-md border px-2.5 py-1 text-[13px] ${c.name === pick ? 'border-fg bg-fg text-surface' : 'border-rule text-fg-muted hover:border-fg hover:text-fg'}`}>{c.title}</button>
              ))}
            </div>
            <div role="tabpanel" className="mx-5 mb-4 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border border-rule bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-medium">{card.title}</h3>
                  <p className="cap mt-0.5 first-letter:uppercase">{card.describes}</p>
                </div>
                <span className="chip shrink-0" data-status={card.resultStatus}>Ends {card.resultWord.toLowerCase()}</span>
              </div>
              <p className="mt-3 text-[13px]">{card.tip}</p>
              <ol className="mt-3 space-y-1.5 border-l border-rule pl-4">
                {card.says.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-[22px]">
                    <span className="w-4 shrink-0 font-mono text-[12px] leading-[22px] text-fg-muted">{i + 1}</span>
                    <span>{s.startsWith('(') ? <span className="text-fg-muted">{s}</span> : `“${s}”`}</span>
                  </li>
                ))}
              </ol>
              <p className="cap mt-3">Payments stay held in every scenario. Only a signed-in person can release them.</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                {card.run ? (<>
                  <Link href={`/cases?replay=${card.run}`} className={linkBtn}>Replay the recorded run {'→'}</Link>
                  <Link href={`/cases?replay=${card.run}&at=0`} className={linkBtn}>Step through it</Link>
                  {card.name === 'denied' && <Link href="/cases?replay=fraud-live" className={linkBtn}>Replay the real call</Link>}
                </>) : <span className="cap">No recorded run for this one. Send the fake bank change and play it live.</span>}
              </div>
            </div>
          </Card>

          <div data-present-hide className="flex min-h-0 flex-col gap-4">
            <Card title="Send a test email" aside="Simulated" className="min-h-0 flex-1">
              <p className="cap px-5 pb-1">Real detection, holds and policy. Only the mail delivery is skipped.</p>
              <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto px-5 pb-2">
                {EMAILS.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{m.title}</span><span className="block text-[12px] leading-4 text-fg-muted">{m.note}</span></span>
                    <button type="button" disabled={busy !== null} onClick={() => void inject(m.id, m.title)} className={btn}>{busy === m.id ? 'Sending…' : armed === m.id ? INJECT_CONFIRM : 'Send'}</button>
                    {armed === m.id && <button type="button" onClick={() => setArmed(null)} className="text-[13px] text-fg-muted hover:text-fg">Cancel</button>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="What just happened">
              <ul className="space-y-1 px-5 pb-4 pt-1 text-[12px]" aria-live="polite">
                {log.length === 0 && <li className="text-fg-muted">Nothing yet.</li>}
                {log.map((l, i) => <li key={`${l.at}-${i}`} className="truncate" title={l.text}><span className="font-mono text-fg-muted">{l.at}</span> {l.text}</li>)}
              </ul>
            </Card>
          </div>
        </main>
      )}
      <footer data-present-hide className="flex h-9 shrink-0 items-center border-t border-rule px-5 text-[12px] text-fg-muted">
        <span>Hidden page. Every button needs the passcode session.</span>
        <button type="button" className="ml-auto hover:text-fg hover:underline underline-offset-4" onClick={() => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])} aria-label="Change theme">Theme: {theme}</button>
      </footer>
    </div>
    <PresentMode theme={theme} />
    </>
  );
}
