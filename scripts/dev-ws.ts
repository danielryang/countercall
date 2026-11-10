// scripts/dev-ws.ts - local dev with NO tunnel: AgentMail WebSocket -> your local /api/dev/inject. Run next dev, then: npx tsx scripts/dev-ws.ts
import { AgentMailClient } from 'agentmail';
import { RECEIVED_EVENTS } from '../lib/detect/agentmail';

const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
const socket = await client.websockets.connect();
socket.on('open', () => socket.sendSubscribe({ type: 'subscribe', inboxIds: [process.env.AP_INBOX!], eventTypes: [...RECEIVED_EVENTS] }));
socket.on('message', async (e) => {
  if (e.type !== 'event' || !('message' in e) || !e.eventType.startsWith('message.received')) return;
  // forward only ids; the handler re-fetches the full message (auth results, headers, body) over REST
  await fetch('http://localhost:3000/api/dev/inject', { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-key': process.env.DEMO_INJECT_KEY! },
    body: JSON.stringify({ agentmailEvent: { event_type: e.eventType, event_id: e.eventId, message: { inbox_id: e.message.inboxId, message_id: e.message.messageId } } }) });
});
