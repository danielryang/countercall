import assert from 'node:assert/strict';
import { test } from 'node:test';
import vendorsFile from '../../fixtures/vendors.json';
import { requestSummary } from '../events';
import { FIXTURES, fixtureToEmail, replayExtract } from './fixtures';
import { memoryDeps } from './deps.memory';
import { ingestEmail, type AppEvent, type CallContext, type Deps } from './ingest';
import type { OrgConfig, Vendor } from './types';

const { org, vendors } = vendorsFile as unknown as { org: OrgConfig; vendors: Vendor[] };
const fx = (id: string) => FIXTURES.find((f) => f.id.startsWith(id))!;

/** memoryDeps plus recorders for the seams S2 added. */
function harness(over: Partial<Deps> = {}) {
  const m = memoryDeps(vendors, org);
  const tasks: { kind: string; reason: string }[] = [], calls: CallContext[] = [];
  const deps: Deps = { ...m.deps, createTask: async (_c, kind, _t, reason) => void tasks.push({ kind, reason }), startCall: async (_c, _v, ctx) => void calls.push(ctx), ...over };
  return { deps, events: m.events, tasks, calls };
}
const run = (id: string, deps: Deps) => ingestEmail(fixtureToEmail(fx(id)), { ...deps, extract: replayExtract(fx(id)) });
const types = (events: AppEvent[]) => events.map((e) => e.type);

test('bank change from an allowed sender: hold, call requested, call seam invoked, summary built in code', async () => {
  const h = harness({ canAct: () => true });
  await run('01', h.deps);
  assert.ok(types(h.events).includes('payment.held'));
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].requestSummary, requestSummary(h.calls[0].emailReceivedAt), 'never email-derived text');
  assert.deepEqual(h.tasks, []);
});

test('sender not on the inbound allowlist: flagged and recorded, but no hold and no call', async () => {
  const h = harness({ canAct: () => false });
  await run('01', h.deps);
  assert.ok(types(h.events).includes('case.flagged'));
  assert.ok(!types(h.events).includes('payment.held') && !types(h.events).includes('call.requested'));
  assert.equal(h.calls.length, 0);
  assert.match(h.tasks[0].reason, /allowlist/);
});

test('a hold that fails creates a hold_failed task, and the callback is still requested (a human is alerted)', async () => {
  const h = harness({ holdPayments: async () => ({ rampMode: 'mock', vendorHold: 'failed', bills: [] }) });
  await run('01', h.deps);
  assert.ok(h.tasks.some((t) => t.kind === 'hold_failed'));
  assert.equal(h.calls.length, 1);
});

test('a duplicate open request gets a review task and no second call', async () => {
  const h = harness({ claimCallback: async () => false });
  await run('01', h.deps);
  assert.equal(h.calls.length, 0);
  assert.ok(h.tasks.some((t) => t.kind === 'review' && /Duplicate|already open/i.test(t.reason)));
});

test('a task-only decision (exec wire) creates a review task and never holds or calls', async () => {
  const h = harness();
  await run('06', h.deps);
  assert.ok(!types(h.events).includes('payment.held'));
  assert.equal(h.calls.length, 0);
  assert.equal(h.tasks.length, 1);
});

test('a benign invoice is cleared with no task, hold or call', async () => {
  const h = harness();
  await run('07', h.deps);
  assert.ok(types(h.events).includes('case.cleared'));
  assert.deepEqual([h.tasks.length, h.calls.length], [0, 0]);
});
