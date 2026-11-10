import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Webhook } from 'svix';
import { handleAgentMailEvent } from '../lib/detect/agentmail';
import { memoryDeps } from '../lib/detect/deps.memory';
import { FIXTURES, fixtureToEmail, injectFixture, replayExtract } from '../lib/detect/fixtures';

// 1. svix round trip exactly as the route does it (lowercase header map from Object.fromEntries(req.headers))
const secret = 'whsec_' + Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
const payload = JSON.stringify({ event_type: 'message.received', event_id: 'evt_1' });
const ts = new Date(); const sig = new Webhook(secret).sign('msg_1', ts, payload);
const headers = Object.fromEntries(new Headers({ 'svix-id': 'msg_1', 'svix-timestamp': String(Math.floor(ts.getTime() / 1000)), 'svix-signature': sig }));
new Webhook(secret).verify(payload, headers); // returns void in svix 2.x; throws on mismatch
assert.throws(() => new Webhook(secret).verify(payload + ' ', headers));

// 2. a realistic AgentMail webhook body (snake_case, from_ as ARRAY, authentication_results present) through the real handler
const { org, vendors } = JSON.parse(readFileSync('fixtures/vendors.json', 'utf8'));
const f = FIXTURES.find((x) => x.id.startsWith('05'))!;
const { deps, events, holds } = memoryDeps(vendors, org, replayExtract(f));
const evt = { event_type: 'message.received.unauthenticated', event_id: 'evt_2', message: { inbox_id: 'rice-ap@agentmail.to', message_id: '<abc@acme-corp.co>', thread_id: 'thd_1', from_: ['Acme Corp AP <AP@Acme-Corp.co>'], reply_to: [], to: ['rice-ap@agentmail.to'], subject: 'Invoice 4471 - updated payment instructions', text: f.email.body,
  authentication_results: { spf: 'pass', dkim: 'pass', dmarc: 'pass', dkim_domain: 'acme-corp.co' }, labels: ['unauthenticated'], timestamp: '2026-11-09T23:00:00Z' } };
const d = await handleAgentMailEvent(evt, deps);
assert.equal(d!.risk, 'critical'); assert.deepEqual(holds, [{ vendorId: 'v_acme', paymentIds: ['pay_8101', 'pay_8102'] }]);
assert.deepEqual(events.map((e) => e.type), ['email.received', 'email.classified', 'case.flagged', 'payment.held', 'call.requested']);
const call = events.find((e) => e.type === 'call.requested') as any; assert.equal(call.phone, '+14155550142'); console.log('call context for voice agent:', JSON.stringify(call.context));
// 3. dedupe: same event twice => processed once
assert.equal(await handleAgentMailEvent(evt, deps), null);
// 4. injector: same fixture 3x is 3 cases (fresh ids), and anti call-spam collapses to ONE open callback for identical bank details
const m2 = memoryDeps(vendors, org); for (let i = 0; i < 3; i++) await injectFixture(f.id, m2.deps, { replay: true });
assert.equal(m2.events.filter((e) => e.type === 'case.flagged').length, 3); assert.equal(m2.events.filter((e) => e.type === 'call.requested').length, 1);
// 5. LLM down => deterministic path still holds
const m3 = memoryDeps(vendors, org, async () => ({ extraction: null, spans: [], evidenceDropped: 0, ms: 1, error: 'timeout' }));
await (await import('../lib/detect/ingest')).ingestEmail(fixtureToEmail(f), m3.deps); assert.equal(m3.holds.length, 1);
console.log('smoke: ok');
