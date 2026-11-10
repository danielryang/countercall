// /dev/states?run=fraud&at=12: render the reducer state after the first `at` events of a recorded run. Used by the screenshot loop and for reviewing exact frames.
// Gated by DEMO_ENABLED (reads static JSON, no DB). Until the real screens exist this prints the facts a screen would draw.
import { notFound } from 'next/navigation';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { reduce } from '@/lib/reducer';
import type { Run } from '@/lib/runs';
import { fmtCents, heldCents } from '@/lib/selectors';

export const dynamic = 'force-dynamic';
const DIR = join(process.cwd(), 'public', 'runs');

export default async function States({ searchParams }: { searchParams: Promise<{ run?: string; at?: string }> }) {
  if ((process.env.DEMO_ENABLED ?? '1') !== '1') notFound();
  const sp = await searchParams;
  const names = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  const name = sp.run && names.includes(sp.run) ? sp.run : names[0];
  const run = JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as Run;
  const at = Math.max(0, Math.min(run.events.length, Number.parseInt(sp.at ?? String(run.events.length), 10) || 0));
  const state = reduce(run.events.slice(0, at));
  const c = Object.values(state.cases)[0];
  return (
    <main data-app style={{ padding: 24, maxWidth: 1100 }}>
      <p>runs: {names.map((n) => <a key={n} href={`?run=${n}&at=${run.events.length}`} style={{ marginRight: 12 }}>{n}</a>)}</p>
      <h1 style={{ fontSize: 20 }}>{name} @ {at}/{run.events.length}: {run.description}</h1>
      <p>state: <b>{c?.state ?? 'none'}</b> · frozen: <b>{fmtCents(heldCents(state))}</b> · call: {c?.call?.status ?? '-'} · outcome: {c?.call?.outcome?.decision.outcome ?? '-'} ({c?.call?.outcome?.decision.reason ?? '-'})</p>
      <ol>{run.events.slice(0, at).map((e) => <li key={e.seq}>{e.seq} {e.type} <small>{e.actor} +{e.delay_ms}ms</small></li>)}</ol>
    </main>
  );
}
