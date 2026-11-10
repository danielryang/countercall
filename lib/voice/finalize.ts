// lib/voice/finalize.ts
// lib/voice/finalize.ts — turns recorded tool calls + telephony result + second-reader into ONE outcome. Idempotent.
import { decideOutcome, type Answer, type Decision, type Flag, type SpeakerRole } from "./decide";
import { emit } from "./events";

export interface CaseStore {                        // architect/agent 05 implements this on the chosen DB
  getExpectedLast4(caseId: string): Promise<string>;                                   // server-side secret; never sent to Retell
  addToolCall(caseId: string, callId: string, key: string, name: string, args: Record<string, unknown>): Promise<void>; // upsert on (callId, key): Retell retries tool calls
  getToolCalls(callId: string): Promise<{ name: string; args: Record<string, unknown> }[]>;
  saveOutcome(caseId: string, callId: string, d: Decision): Promise<boolean>;          // false if an outcome already exists for callId
}

type AnalyzedCall = { disconnection_reason?: string; call_analysis?: { call_summary?: string; custom_analysis_data?: Record<string, unknown> } };

export async function finalizeCall(store: CaseStore, caseId: string, callId: string, call: AnalyzedCall): Promise<Decision | null> {
  const rows = await store.getToolCalls(callId);
  const secondRaw = call.call_analysis?.custom_analysis_data?.vendor_answer;
  const decision = decideOutcome({
    disconnectionReason: call.disconnection_reason ?? null,
    expectedLast4: await store.getExpectedLast4(caseId),
    answers: rows.filter((r) => r.name === "report_answer").map((r) => ({
      answer: String(r.args.answer) as Answer, speakerRole: String(r.args.speaker_role ?? "unknown") as SpeakerRole })),
    challenges: rows.filter((r) => r.name === "report_challenge").map((r) => ({ digits: String(r.args.digits ?? "") })),
    flags: rows.filter((r) => r.name === "report_flag").map((r) => String(r.args.flag) as Flag),
    secondReader: typeof secondRaw === "string" ? (secondRaw as "yes" | "no" | "unsure" | "none") : null,
  });
  if (!(await store.saveOutcome(caseId, callId, decision))) return null;   // already decided: this was a webhook retry
  await emit({ type: "call.outcome", caseId, callId, decision, summary: call.call_analysis?.call_summary, at: Date.now() });
  return decision;
}
