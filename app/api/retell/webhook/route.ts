// app/api/retell/webhook/route.ts
// app/api/retell/webhook/route.ts — Node runtime (Retell.verify uses node crypto). Respond fast; Retell times out at 10 s and retries 3x.
import { verifyRetell } from "../../../../lib/voice/retell";
import { emit, type TranscriptItem } from "../../../../lib/voice/events";
import { finalizeCall } from "../../../../lib/voice/finalize";
import { store } from "../../../../lib/store";

export const runtime = "nodejs";

type RetellWebhook = {
  event: "call_started" | "call_ended" | "call_analyzed" | "transcript_updated" | `transfer_${string}`;
  call: {
    call_id: string; metadata?: { case_id?: string };
    disconnection_reason?: string;
    transcript_object?: { role: "agent" | "user"; content: string }[];
    transcript_with_tool_calls?: Record<string, unknown>[];
    recording_url?: string; recording_multi_channel_url?: string;
    call_analysis?: { call_summary?: string; custom_analysis_data?: Record<string, unknown> };
  };
};

const toItems = (call: RetellWebhook["call"]): TranscriptItem[] =>
  (call.transcript_object ?? []).map((t, i) => ({ id: `${t.role}_${i}`, role: t.role, text: t.content, tSec: i }));

export async function POST(req: Request) {
  const raw = await req.text();                                   // never JSON.stringify(parsed) — signature is over the raw bytes
  if (!(await verifyRetell(raw, req))) return new Response("unauthorized", { status: 401 });
  const { event, call } = JSON.parse(raw) as RetellWebhook;
  const caseId = call.metadata?.case_id;
  if (!caseId) return new Response(null, { status: 204 });        // not one of ours (e.g. a test call from the dashboard)
  const base = { caseId, callId: call.call_id, at: Date.now() };

  switch (event) {
    case "call_started":
      await emit({ ...base, type: "call.status", status: "connected" });
      break;
    case "transcript_updated":
      await emit({ ...base, type: "call.transcript.delta", items: toItems(call), final: false });
      break;
    case "call_ended":
      await emit({ ...base, type: "call.transcript.delta", items: toItems(call), final: true });
      await emit({ ...base, type: "call.status", status: call.disconnection_reason?.startsWith("dial_") ? "failed" : "ended", disconnectionReason: call.disconnection_reason });
      break;
    case "call_analyzed":
      await emit({ ...base, type: "call.recording", monoUrl: call.recording_url, stereoUrl: call.recording_multi_channel_url });
      await finalizeCall(store, caseId, call.call_id, call); // decides once; idempotent on call_id
      break;
  }
  return new Response(null, { status: 204 });
}
