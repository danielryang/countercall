// scripts/setup-agentmail.ts - one-time: create the AP inbox + webhook. WEBHOOK_URL=https://<app>.vercel.app/api/webhooks/agentmail npx tsx scripts/setup-agentmail.ts
import { AgentMailClient } from 'agentmail';
import { RECEIVED_EVENTS } from '../lib/detect/agentmail';

const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
const inbox = await client.inboxes.create({ username: 'rice-ap', displayName: 'Rice Robotics AP' }); // -> rice-ap@agentmail.to
const hook = await client.webhooks.create({ url: process.env.WEBHOOK_URL!, eventTypes: [...RECEIVED_EVENTS], inboxIds: [inbox.inboxId] });
console.log(`AP_INBOX=${inbox.inboxId}\nAGENTMAIL_WEBHOOK_SECRET=${hook.secret}`); // 403 here => the API key lacks label_unauthenticated_read / label_spam_read: create a key with them in the console
