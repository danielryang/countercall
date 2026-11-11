// lib/voice/handle.ts: Retell webhook + tool-call logic, separated from the HTTP routes so the same code runs under Next, the replay script and the tests.
// Signature verification stays in the routes (it needs the raw body). Everything here is idempotent: Retell retries 3x and does not order events.
import { createHash } from 'node:crypto';
import type { CallEvent, TranscriptItem } from './events';
import { finalizeCall, type CaseStore } from './finalize';

export interface VoiceCtx {
  store: CaseStore;
  emit: (e: CallEvent) => Promise<unknown>;
  markEnded: (callId: string, disconnectionReason?: string) => Promise<void>;   // calls.ended_at / disconnection_reason (a no-op if already set)
}

export type RetellCall = {
  call_id: string; metadata?: { case_id?: string; attempt?: number };
  disconnection_reason?: string;
  transcript_object?: { role: 'agent' | 'user'; content: string }[];                 // only filled in after the call ends
  transcript_with_tool_calls?: { role: string; content?: unknown }[];               // what transcript_updated carries DURING the call: lines + tool calls
  recording_url?: string; recording_multi_channel_url?: string;
  call_analysis?: { call_summary?: string; custom_analysis_data?: Record<string, unknown> };
};
export type RetellWebhook = { event: 'call_started' | 'call_ended' | 'call_analyzed' | 'transcript_updated' | `transfer_${string}`; call: RetellCall };
export type ToolPayload = { name: string; args: Record<string, unknown>; call: RetellCall };

export const TOOL_NAMES = ['report_answer', 'report_challenge', 'report_flag'] as const;
type ToolName = (typeof TOOL_NAMES)[number];

/** The lines spoken so far. During the call Retell sends them only in transcript_with_tool_calls (agent and user lines plus tool calls, which are not
 *  lines); transcript_object arrives after the call ends. Reading only transcript_object made every live update look empty (found 2026-11-10, CC-0117:
 *  the transcript appeared all at once when the call ended). */
const spokenLines = (call: RetellCall): { role: 'agent' | 'user'; content: string }[] =>
  call.transcript_object?.length ? call.transcript_object
    : (call.transcript_with_tool_calls ?? []).filter((t): t is { role: 'agent' | 'user'; content: string } => (t.role === 'agent' || t.role === 'user') && typeof t.content === 'string');
const toItems = (call: RetellCall): TranscriptItem[] => spokenLines(call).map((t, i) => ({ id: `${t.role}_${i}`, role: t.role, text: t.content, tSec: i }));
// No conversation will be analysed after these: the call never connected, so decide now (fail closed) instead of hanging in `calling`.
const neverConnected = (reason?: string) => !!reason && (reason.startsWith('dial_') || reason.startsWith('error_'));

export async function processRetellWebhook(ctx: VoiceCtx, p: RetellWebhook): Promise<void> {
  const { event, call } = p;
  const caseId = call.metadata?.case_id;
  if (!caseId) return;                                             // not one of ours (e.g. a dashboard test call)
  const base = { caseId, callId: call.call_id, at: Date.now() };
  switch (event) {
    case 'call_started':
      await ctx.emit({ ...base, type: 'call.status', status: 'connected' });
      break;
    case 'transcript_updated':
      await ctx.emit({ ...base, type: 'call.transcript.delta', items: toItems(call), final: false });
      break;
    case 'call_ended':
      await ctx.emit({ ...base, type: 'call.transcript.delta', items: toItems(call), final: true });
      await ctx.emit({ ...base, type: 'call.status', status: neverConnected(call.disconnection_reason) ? 'failed' : 'ended', disconnectionReason: call.disconnection_reason });
      await ctx.markEnded(call.call_id, call.disconnection_reason);
      if (neverConnected(call.disconnection_reason)) await finalizeCall(ctx.store, caseId, call.call_id, call, ctx.emit);
      break;
    case 'call_analyzed':
      await ctx.emit({ ...base, type: 'call.recording', monoUrl: call.recording_url, stereoUrl: call.recording_multi_channel_url });
      await finalizeCall(ctx.store, caseId, call.call_id, call, ctx.emit);   // decides once; idempotent on call_id
      break;
  }
}

export async function processToolCall(ctx: VoiceCtx, p: ToolPayload): Promise<{ status: number; body: { recorded: boolean } }> {
  const caseId = p.call.metadata?.case_id;
  if (!caseId || !(TOOL_NAMES as readonly string[]).includes(p.name)) return { status: 400, body: { recorded: false } };
  const args = p.args && typeof p.args === 'object' ? p.args : {};
  // identical retry => identical key => the upsert is a no-op
  const key = `${p.name}:${createHash('sha256').update(JSON.stringify(args)).digest('hex').slice(0, 12)}:${p.call.transcript_object?.length ?? 0}`;
  await ctx.store.addToolCall(caseId, p.call.call_id, key, p.name, args);
  await ctx.emit({ type: 'call.tool', caseId, callId: p.call.call_id, name: p.name as ToolName, args, at: Date.now() });
  return { status: 200, body: { recorded: true } };   // deliberately content-free: nothing about match/mismatch reaches the callee
}
