// scripts/setup-agentmail.ts: one-time. Get-or-create the AP inbox, then register the webhook at PUBLIC_BASE_URL.
//   PUBLIC_BASE_URL=https://<app>.vercel.app npm run setup:agentmail
// Prints AGENTMAIL_INBOX_ID and AGENTMAIL_WEBHOOK_SECRET: put both in .env.local AND in Vercel (Production).
import { AgentMailClient } from 'agentmail';
import { RECEIVED_EVENTS } from '../lib/detect/agentmail';

const apiKey = process.env.AGENTMAIL_API_KEY;
const base = process.env.PUBLIC_BASE_URL;
if (!apiKey) throw new Error('AGENTMAIL_API_KEY is not set');
if (!base) throw new Error('PUBLIC_BASE_URL is not set (https://<app>.vercel.app, or a cloudflared tunnel URL while developing)');
const url = `${base.replace(/\/$/, '')}/api/webhooks/agentmail`;

const client = new AgentMailClient({ apiKey });

async function getOrCreateInbox(): Promise<string> {
  const existing = process.env.AGENTMAIL_INBOX_ID;
  if (existing) {
    try { return (await client.inboxes.get(existing)).inboxId; }
    catch (err) { console.warn(`inbox ${existing} not found (${(err as Error).message}); creating one`); }
  }
  const wanted = existing?.split('@')[0] ?? 'rice-ap';
  for (const username of [wanted, `${wanted}-${Math.random().toString(36).slice(2, 6)}`]) {
    try { return (await client.inboxes.create({ username, displayName: 'Rice Robotics AP' })).inboxId; }
    catch (err) { console.warn(`could not create ${username}: ${(err as Error).message}`); }
  }
  throw new Error('could not create an inbox');
}

const inboxId = await getOrCreateInbox();
// 403 here => the API key lacks label_unauthenticated_read / label_spam_read: create a key with them in the AgentMail console.
const hook = await client.webhooks.create({ url, eventTypes: [...RECEIVED_EVENTS], inboxIds: [inboxId] });
console.log(`webhook registered: ${url}`);
console.log(`AGENTMAIL_INBOX_ID=${inboxId}\nAGENTMAIL_WEBHOOK_SECRET=${hook.secret}`);
console.log('If the inbox name differs from rice-ap@agentmail.to, update org.ap_inbox in db/002_seed.sql and the README.');
