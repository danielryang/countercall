// scripts/replay-webhooks.ts (npm run replay:webhooks -- all | <scenario>): replays signed Retell webhooks at a RUNNING app and asserts the outcome.
//   BASE_URL (default http://localhost:3000), RETELL_API_KEY and DATABASE_URL (same database the app uses) must be set.
// It creates a real held case + call row per scenario (so the UI shows them): run `npm run demo:reset` afterwards. It never places a phone call.
import { Retell } from 'retell-sdk';
import { startCall } from '../lib/call';
import { emit, q } from '../lib/store';
import { createTask } from '../lib/detect/deps';
import { applyVariant, SCENARIOS, type Variant } from '../lib/voice/scenarios';
import { sql } from '../lib/store';

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const key = process.env.RETELL_API_KEY;
if (!key || !process.env.DATABASE_URL) throw new Error('RETELL_API_KEY and DATABASE_URL must be set');
if (!/localhost|127\.0\.0\.1/.test(BASE) && !process.argv.includes('--yes')) throw new Error(`BASE_URL is ${BASE}; pass --yes to replay against a deployed app`);

const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'all';
const wanted = arg === 'all' ? SCENARIOS : SCENARIOS.filter((s) => s.name === arg);
if (!wanted.length) throw new Error(`unknown scenario ${arg}; use all or ${SCENARIOS.map((s) => s.name).join(', ')}`);

const post = async (path: string, body: string, signature: string | null) =>
  fetch(BASE + path, { method: 'POST', body, headers: { 'content-type': 'application/json', ...(signature ? { 'x-retell-signature': signature } : {}) } });

async function newHeldCase(): Promise<string> {
  const [c] = await q<{ id: string }>(`insert into cases (source, vendor_id, claimed_last4) values ('demo_replay','v_acme','4321') returning id`);
  await q(`update cases set state = 'flagged' where id = $1`, [c.id]); await q(`update cases set state = 'held' where id = $1`, [c.id]);
  return c.id;
}

async function run(name: string, variant: Variant) {
  const sc = SCENARIOS.find((s) => s.name === name)!;
  const caseId = await newHeldCase();
  const callId = `replay_${name}_${variant}_${Date.now()}`;
  await q(`update calls set ended_at = now() where ended_at is null`);   // the in-flight guard would otherwise refuse a second replay
  const started = await startCall({ q, emit: (e) => emit(e), createTask, callsEnabled: true, perVendorHourLimit: 1000, globalHourLimit: 1000, dial: async () => callId },
    caseId, 'v_acme', { vendorName: 'Acme Corp', requestSummary: 'Replay.' });
  if (!started.started) throw new Error(`could not reserve a replay call: ${started.reason}`);
  const [{ challenge_expected }] = await q<{ challenge_expected: string }>(`select challenge_expected from cases where id = $1`, [caseId]);
  for (const step of applyVariant(sc.build({ caseId, callId, expectedLast4: challenge_expected }), variant)) {
    const isTool = step.kind === 'tool';
    const body = JSON.stringify(step.payload);
    const res = await post(isTool ? '/api/retell/tool' : '/api/retell/webhook', body, await Retell.sign(body, key!));
    if (res.status >= 300) throw new Error(`${isTool ? 'tool' : 'webhook'} ${res.status}`);
  }
  const events = (await (await fetch(`${BASE}/api/events?case=${caseId}`)).json()) as { events: { type: string; payload: { decision?: { outcome: string; reason: string } } }[] };
  const outcomes = events.events.filter((e) => e.type === 'call.outcome');
  const [row] = await q<{ state: string }>(`select state from cases where id = $1`, [caseId]);
  const got = outcomes[0]?.payload.decision;
  const ok = outcomes.length === 1 && got?.outcome === sc.expected.outcome && got?.reason === sc.expected.reason && row.state === sc.expected.state;
  return { ok, line: `${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(10)} ${variant.padEnd(22)} ${got?.outcome ?? '-'}/${got?.reason ?? '-'} -> ${row.state}  (${outcomes.length} outcome${outcomes.length === 1 ? '' : 's'})` };
}

let failed = 0;
for (const sc of wanted) {
  for (const variant of (arg === 'all' ? ['normal', 'duplicated', 'analyzed_before_ended'] : ['normal']) as Variant[]) {
    const r = await run(sc.name, variant);
    console.log(r.line); if (!r.ok) failed++;
  }
}
if (arg === 'all') {   // transport check: a bad signature is rejected and writes nothing
  const body = JSON.stringify({ event: 'call_started', call: { call_id: 'forged', metadata: { case_id: 'CC-9999' } } });
  const bad = await post('/api/retell/webhook', body, 'v=1,d=deadbeef'); const none = await post('/api/retell/webhook', body, null);
  const ok = bad.status === 401 && none.status === 401;
  console.log(`${ok ? 'PASS' : 'FAIL'}  bad signature -> ${bad.status}, missing signature -> ${none.status} (want 401, 401)`); if (!ok) failed++;
}
console.log(failed ? `\n${failed} FAILED` : '\nall replays matched. Run `npm run demo:reset` to clear the replay cases from the queue.');
await sql.end();
process.exit(failed ? 1 : 0);
