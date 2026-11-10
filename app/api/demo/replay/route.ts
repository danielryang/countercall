// app/api/demo/replay/route.ts: "dry-run" mode: same events, same decide(), zero telephony. Session + DEMO_ENABLED=1, else 404 (PLAN s13 B1).
import { requireDemo } from "@/lib/auth";
import { decideOutcome } from "@/lib/voice/decide";
import { emit } from "@/lib/voice/events";
import { FIXTURES } from "@/lib/voice/fixtures";

export const maxDuration = 60;                    // keep fixtures under ~40 s of event time, or pass speed=1.5
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const gate = requireDemo(req);
  if (gate instanceof Response) return gate;
  const { caseId, scenario = "deny", speed = 1 } = (await req.json()) as { caseId: string; scenario?: "deny" | "confirm"; speed?: number };
  const fx = FIXTURES[scenario]; const callId = `replay_${Date.now()}`;
  await emit({ type: "call.created", caseId, callId, mode: "replay", at: Date.now() });
  await emit({ type: "call.status", caseId, callId, status: "dialing", at: Date.now() });
  for (const s of fx.steps) {
    await sleep(s.dt / speed);
    const at = Date.now();
    if (s.status) await emit({ type: "call.status", caseId, callId, status: s.status, disconnectionReason: s.status === "ended" ? "agent_hangup" : undefined, at });
    if (s.transcript) await emit({ type: "call.transcript.delta", caseId, callId, items: s.transcript, final: false, at });
    if (s.tool) await emit({ type: "call.tool", caseId, callId, ...s.tool, at });
  }
  await emit({ type: "call.outcome", caseId, callId, decision: decideOutcome(fx.decide), summary: "(replay)", at: Date.now() });
  return Response.json({ callId });
}
