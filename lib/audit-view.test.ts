import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { AuditReport, ChainReport, ReplayReport } from './audit';
import { actorKind, auditCaseIds, auditRows, badgeState, exportDoc, groupOf, nextAuditFetch, AUDIT_MIN_GAP_MS } from './audit-view';
import { AUDIT, AUDIT_ACTOR, AUDIT_GROUP, EVENT_LINE } from './copy';
import { reduce } from './reducer';
import type { Run } from './runs';

const replayOk: ReplayReport = { cases: 9, events: 120, matched: 9, outOfBand: [], mismatchCount: 0, mismatches: [] };
const chainOk: ChainReport = { installed: true, intact: true, checked: 120, preChain: 0, preChainMaxSeq: 0, breaks: 0, firstBreak: null, head: { seq: 120, hash: 'ab'.repeat(32) } };
const report = (chain: ChainReport, replay: ReplayReport = replayOk): AuditReport => ({ ok: true, checkedAt: '2026-11-10T18:00:00.000Z', ms: 40, chain, replay });

test('badgeState: each of the five states, first rule wins', () => {
  assert.equal(badgeState(null), 'unavailable');
  assert.equal(badgeState(report({ installed: false })), 'not_installed');
  // not installed beats a replay mismatch: the badge speaks about the seal first, the page still lists the mismatch
  assert.equal(badgeState(report({ installed: false }, { ...replayOk, matched: 8, mismatchCount: 1 })), 'not_installed');
  const broken: ChainReport = { ...chainOk, intact: false, breaks: 2, firstBreak: { seq: 57, kind: 'hash_mismatch', expected: 'aa', found: 'bb' } };
  assert.equal(badgeState(report(broken)), 'broken');
  assert.equal(badgeState(report(broken, { ...replayOk, matched: 8, mismatchCount: 1 })), 'broken');
  assert.equal(badgeState(report(chainOk, { ...replayOk, matched: 8, mismatchCount: 1 })), 'replay_mismatch');
  assert.equal(badgeState(report(chainOk)), 'intact');
});

test('nextAuditFetch: once on mount, then only when the log moved, never twice within 10 s', () => {
  const now = 1_000_000;
  assert.equal(nextAuditFetch({ now, lastAt: null, inflight: false, seq: 0, seqAtLast: null }), 'now');
  assert.equal(nextAuditFetch({ now, lastAt: null, inflight: true, seq: 0, seqAtLast: null }), 'skip');
  assert.equal(nextAuditFetch({ now, lastAt: now - 60_000, inflight: false, seq: 50, seqAtLast: 50 }), 'skip', 'nothing new');
  assert.equal(nextAuditFetch({ now, lastAt: now - 60_000, inflight: false, seq: 51, seqAtLast: 50 }), 'now');
  assert.equal(nextAuditFetch({ now, lastAt: now - 4_000, inflight: false, seq: 51, seqAtLast: 50 }), AUDIT_MIN_GAP_MS - 4_000);
  assert.equal(nextAuditFetch({ now, lastAt: now - AUDIT_MIN_GAP_MS, inflight: false, seq: 51, seqAtLast: 50 }), 'now');
});

test('groupOf / actorKind: every stored actor maps to a filter, unknown actors are never shown as a person', () => {
  assert.equal(groupOf('email.received'), 'email');
  assert.equal(groupOf('ramp.call'), 'payment');
  assert.equal(groupOf('payment.released'), 'payment');
  assert.equal(groupOf('call.transcript.delta'), 'call');
  assert.equal(groupOf('case.state'), 'case');
  assert.equal(groupOf('task.created'), 'task');
  assert.equal(groupOf('system.reset'), 'system');
  assert.equal(actorKind('human:A. Patel'), 'human');
  assert.equal(actorKind('voice_agent'), 'voice_agent');
  assert.equal(actorKind('policy'), 'policy');
  assert.equal(actorKind('detector'), 'detector');
  assert.equal(actorKind('system'), 'system');
  assert.equal(actorKind('somebody'), 'system');
});

test('audit copy: a plain line for every event type in the recorded runs, and never "hash" or "tamper-proof" on screen', () => {
  const dir = new URL('../public/runs/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const run = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Run;
    for (const e of run.events) assert.ok(EVENT_LINE[e.type], `${f}: no plain line for ${e.type}`);
  }
  const words = JSON.stringify([AUDIT, AUDIT_GROUP, AUDIT_ACTOR, EVENT_LINE]) +
    [AUDIT.sealed(3), AUDIT.preChain(2), AUDIT.broken(7), AUDIT.rebuilt(1, 2), AUDIT.outOfBand(1), AUDIT.mismatch('CC-1', 'a', 'b'), AUDIT.checkedAt('x', 1)].join(' ');
  assert.ok(!/hash|tamper/i.test(words));
});

test('auditRows over a real recorded run: newest first, every event listed once, filters narrow it, export keeps only listed rows', () => {
  const run = JSON.parse(readFileSync(new URL('../public/runs/fraud.json', import.meta.url), 'utf8')) as Run;
  const s = reduce(run.events);
  const caseEvents = run.events.filter((e) => e.case_id);
  const all = auditRows(s);
  assert.equal(all.length, caseEvents.length);
  assert.equal(new Set(all.map((r) => r.seq)).size, all.length);
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].seq > all[i].seq, 'newest first');

  const states = auditRows(s, { caseId: null, group: 'case', actor: 'policy' });
  assert.ok(states.length > 0 && states.every((r) => r.group === 'case' && r.actorKind === 'policy'));
  const ids = auditCaseIds(s);
  assert.ok(ids.length >= 1);
  const one = auditRows(s, { caseId: ids[0], group: null, actor: null });
  assert.ok(one.length > 0 && one.every((r) => r.caseId === ids[0]));
  assert.equal(auditRows(s, { caseId: 'CC-NOPE', group: null, actor: null }).length, 0);

  const doc = exportDoc(run.events, states, { source: 'replay:fraud', filter: { caseId: null, group: 'case', actor: 'policy' }, exportedAt: 'x' });
  assert.equal(doc.count, states.length);
  assert.deepEqual(doc.events.map((e) => e.seq), states.map((r) => r.seq).reverse(), 'export is in log order');
  assert.ok(doc.events.every((e) => 'payload' in e));
});
