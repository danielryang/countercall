// lib/voice/events.ts
// lib/voice/events.ts — the contract agent 05 consumes (see Hand-offs). emit() fans out to registered sinks.
import type { Decision } from "./decide";

export type TranscriptItem = { id: string; role: "agent" | "user" | "tool" | "dtmf" | "system"; text: string; tSec: number };
export type CallEvent =
  | { type: "call.created"; caseId: string; callId: string; mode: "phone" | "web" | "replay"; at: number }
  | { type: "call.status"; caseId: string; callId: string; status: "dialing" | "connected" | "ended" | "failed"; disconnectionReason?: string; at: number }
  | { type: "call.transcript.delta"; caseId: string; callId: string; items: TranscriptItem[]; final: boolean; at: number } // replace-by-id; items = whole transcript so far
  | { type: "call.tool"; caseId: string; callId: string; name: "report_answer" | "report_challenge" | "report_flag"; args: Record<string, unknown>; at: number }
  | { type: "call.recording"; caseId: string; callId: string; monoUrl?: string; stereoUrl?: string; at: number }
  | { type: "call.outcome"; caseId: string; callId: string; decision: Decision; summary?: string; at: number };

type Sink = (e: CallEvent) => Promise<void>;
const sinks: Sink[] = [];
/** agent 05: registerSink(async (e) => { await db.insert(callEvents).values(...); await realtime.broadcast(e) }) */
export const registerSink = (s: Sink) => { sinks.push(s); };
export const emit = async (e: CallEvent) => { await Promise.all(sinks.map((s) => s(e))); };
