// eval/run.ts - run every fixture through the REAL pipeline and score it.
//   npx tsx eval/run.ts                 replay mode: uses each fixture's mock_extraction (tests signals + policy + schema; no API key, no network)
//   npx tsx eval/run.ts --det-only      LLM "down": extraction=null (what do the deterministic rules catch alone?)
//   npx tsx eval/run.ts --live          real Claude calls (needs ANTHROPIC_API_KEY); prints latency, tokens, $ per email
//   npx tsx eval/run.ts --live --model claude-sonnet-5-5 --only 13
//   npx tsx eval/run.ts --json video/public/eval.json   also writes per-fixture results + totals as JSON (the video's eval card)
import { readFileSync, writeFileSync } from 'node:fs';
import { analyze } from '../lib/detect/ingest';
import { extract, MODEL, type ExtractResult } from '../lib/detect/extract';
import { replayExtract } from '../lib/detect/fixtures';
import { postCallDecision } from '../lib/detect/policy';
import type { NormalizedEmail, OrgConfig, Risk, Vendor } from '../lib/detect/types';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? undefined : process.argv[i + 1] ?? ''; };
const live = process.argv.includes('--live'), detOnly = process.argv.includes('--det-only');
const model = arg('--model') ?? MODEL, only = arg('--only');
const PRICE: Record<string, [number, number, number, number]> = { // $/MTok: input, output, cache write (5m), cache read. Source: platform.claude.com pricing page, 2026-11-09
  'claude-haiku-5-5': [0.10, 0.50, 0.125, 0.01], 'claude-sonnet-5-5': [2, 10, 2.5, 0.10] };
const RISKS: Risk[] = ['none', 'low', 'medium', 'high', 'critical'];

const { org, vendors } = JSON.parse(readFileSync(new URL('../fixtures/vendors.json', import.meta.url), 'utf8')) as { org: OrgConfig; vendors: Vendor[] };
const fixtures = (JSON.parse(readFileSync(new URL('../fixtures/emails.json', import.meta.url), 'utf8')) as any[]).filter((f) => !only || f.id.startsWith(only));

const cost = (u?: ExtractResult['usage']) => { const p = PRICE[model]; if (!u || !p) return 0; return (u.input_tokens * p[0] + u.output_tokens * p[1] + (u.cache_creation_input_tokens ?? 0) * p[2] + (u.cache_read_input_tokens ?? 0) * p[3]) / 1e6; };
const pad = (s: unknown, n: number) => String(s).padEnd(n).slice(0, n);

let pass = 0, totalCost = 0, mustCatch = 0, caught = 0, shouldPass = 0, falsePos = 0; const lat: number[] = [];
const rows: { id: string; expected: string[]; got: string[]; risk: Risk; ok: boolean }[] = [];
console.log(`mode=${live ? 'live ' + model : detOnly ? 'deterministic-only' : 'replay (mock_extraction)'}\n`);
console.log(pad('fixture', 34), pad('expected', 24), pad('got', 24), pad('risk', 9), pad('llm', 5), pad('ms', 6), 'ok');
for (const f of fixtures) {
  const email: NormalizedEmail = { providerEventId: f.id, source: 'injector', messageId: `<${f.id}@fixture>`, receivedAt: new Date().toISOString(), bodyFull: f.email.body, hiddenChars: 0, htmlOnly: false, unauthenticatedLabel: false, ...f.email };
  const doExtract = async (e: NormalizedEmail): Promise<ExtractResult> => {
    if (live) return extract(e, model);
    if (detOnly) return { extraction: null, spans: [], evidenceDropped: 0, ms: 0 };
    return replayExtract(f)(e);
  };
  const a = await analyze(email, vendors, org, doExtract);
  const got = a.decision.actions.map((x) => x.type), want: string[] = f.expected.actions;
  const call = a.decision.actions.find((x) => x.type === 'START_CALLBACK');
  const vendor = vendors.find((v) => v.id === f.expected.vendorId);
  const checks = [
    JSON.stringify([...got].sort()) === JSON.stringify([...want].sort()),
    a.decision.bankChange === f.expected.bankChange,
    RISKS.indexOf(a.decision.risk) >= RISKS.indexOf(f.expected.riskAtLeast),
    a.decision.category === f.expected.category || detOnly,
    !call || (call.type === 'START_CALLBACK' && call.phone === vendor?.trustedPhone && !a.facts.phones.some((p) => p.e164 === call.phone && !p.matchesOnFile)), // INVARIANT: only ever the on-file number
    !f.after_call || JSON.stringify(Object.entries(postCallDecision(f.after_call.outcome, vendor!)).filter(([k]) => k in f.after_call.expect).map(([k, v]) => [k, v])) === JSON.stringify(Object.entries(f.after_call.expect)),
  ];
  const ok = checks.every(Boolean); if (ok) pass++; rows.push({ id: f.id, expected: want, got, risk: a.decision.risk, ok });
  if (want.includes('HOLD_VENDOR_PAYMENTS')) { mustCatch++; if (got.includes('HOLD_VENDOR_PAYMENTS')) caught++; }
  if (!want.length) { shouldPass++; if (got.length) falsePos++; }
  totalCost += cost(a.ex.usage); if (live) lat.push(a.ex.ms);
  console.log(pad(f.id, 34), pad(want.map((w) => w.replace('HOLD_VENDOR_PAYMENTS', 'HOLD').replace('START_CALLBACK', 'CALL').replace('CREATE_HUMAN_TASK', 'TASK').replace('FLAG_PHISHING', 'FLAG')).join('+') || 'PASS', 24), pad(got.map((w) => w.replace('HOLD_VENDOR_PAYMENTS', 'HOLD').replace('START_CALLBACK', 'CALL').replace('CREATE_HUMAN_TASK', 'TASK').replace('FLAG_PHISHING', 'FLAG')).join('+') || 'PASS', 24), pad(a.decision.risk, 9), pad(a.decision.llmStatus, 5), pad(a.ex.ms, 6), ok ? 'PASS' : 'FAIL ' + checks.map((c, i) => (c ? '' : i)).join(''));
  if (!ok && process.argv.includes('-v')) console.log('   reasons:', a.decision.reasons.map((r) => r.code).join(','), '| category', a.decision.category, '| score', a.decision.score);
}
const p50 = lat.sort((x, y) => x - y)[Math.floor(lat.length / 2)];
console.log(`\n${pass}/${fixtures.length} fixtures correct | bank-change recall (HOLD on must-catch): ${caught}/${mustCatch} | false positives: ${falsePos}/${shouldPass}` +
  (live ? ` | LLM p50 ${p50}ms max ${Math.max(...lat)}ms | $${totalCost.toFixed(5)} total, $${(totalCost / fixtures.length).toFixed(5)}/email` : ''));
const jsonOut = arg('--json');
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ mode: live ? 'live' : detOnly ? 'deterministic-only' : 'replay', model: live ? model : null, generatedAt: new Date().toISOString(),
  n: fixtures.length, pass, recall: { caught, of: mustCatch }, falsePositives: { count: falsePos, of: shouldPass }, ...(live ? { llmMs: { p50, max: Math.max(...lat) }, costUsd: totalCost } : {}), rows }, null, 2) + '\n');
process.exit(pass === fixtures.length || detOnly ? 0 : 1);
