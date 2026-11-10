// src/agentmail.ts - AgentMail event -> pipeline. Used by the webhook route AND the dev WebSocket script (via the injector route).
import { ingestEmail, type Deps } from './ingest';
import { fetchAgentMailMessage, normalizeAgentMail, type AgentMailMessage } from './normalize';

// Subscribe to ALL THREE. A brand-new lookalike domain with no SPF/DKIM/DMARC is delivered as `.unauthenticated`
// and phishing is often labelled spam. Neither arrives as plain `message.received`.
export const RECEIVED_EVENTS = ['message.received', 'message.received.unauthenticated', 'message.received.spam'] as const;

export async function handleAgentMailEvent(evt: { event_type: string; event_id: string; message?: AgentMailMessage }, deps: Deps) {
  if (!(RECEIVED_EVENTS as readonly string[]).includes(evt.event_type) || !evt.message) return null; // ignore message.sent etc. (also prevents reply loops)
  let m = evt.message;
  // The docs do not guarantee authentication_results is inside the webhook body, and bodies > 64 KiB are replaced by body_url. Re-fetch (~150 ms) when in doubt.
  if (!m.authentication_results || m.body_url) {
    try { m = { ...evt.message, ...(await fetchAgentMailMessage(m.inbox_id, m.message_id)) }; }
    catch (err) { console.error('agentmail refetch failed, continuing with webhook payload (auth will read as unknown)', err); }
  }
  return ingestEmail(normalizeAgentMail(m, evt.event_type, evt.event_id), deps);
}
