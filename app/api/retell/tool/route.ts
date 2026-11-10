// app/api/retell/tool/route.ts
// app/api/retell/tool/route.ts — ONE endpoint for all three mid-call tools. Answer in well under 1 s. Never reveals whether a challenge matched.
import { createHash } from "node:crypto";
import { verifyRetell } from "../../../../lib/voice/retell";
import { emit } from "../../../../lib/voice/events";
import { store } from "../../../../lib/store";

export const runtime = "nodejs";
export const preferredRegion = "pdx1";            // Retell appears to run in AWS us-west-2 (S3 URLs, 100.20.5.228); same region = fewer ms. Inference, not documented.
const NAMES = ["report_answer", "report_challenge", "report_flag"] as const;
type ToolName = (typeof NAMES)[number];

export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verifyRetell(raw, req))) return new Response("unauthorized", { status: 401 });
  const { name, call, args } = JSON.parse(raw) as {
    name: string; args: Record<string, unknown>;
    call: { call_id: string; metadata?: { case_id?: string }; transcript_object?: unknown[] };
  };
  const caseId = call.metadata?.case_id;
  if (!caseId || !NAMES.includes(name as ToolName)) return Response.json({ recorded: false }, { status: 400 });

  // identical retry => identical key => upsert is a no-op
  const key = `${name}:${createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 12)}:${call.transcript_object?.length ?? 0}`;
  await store.addToolCall(caseId, call.call_id, key, name, args);
  await emit({ type: "call.tool", caseId, callId: call.call_id, name: name as ToolName, args, at: Date.now() });
  return Response.json({ recorded: true });       // deliberately content-free: no match/mismatch signal reaches the callee
}
