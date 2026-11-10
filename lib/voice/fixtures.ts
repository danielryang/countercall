// lib/voice/fixtures.ts
// lib/voice/fixtures.ts — scripted calls for replay mode and for building the UI before voice works. dt = ms since previous step.
import type { DecideInput } from "./decide";
import type { TranscriptItem } from "./events";

type Step = { dt: number; status?: "connected" | "ended"; transcript?: TranscriptItem[]; tool?: { name: "report_answer" | "report_challenge" | "report_flag"; args: Record<string, unknown> } };
export type Fixture = { steps: Step[]; decide: DecideInput };

const a = (n: number, text: string, tSec: number): TranscriptItem => ({ id: `agent_${n}`, role: "agent", text, tSec });
const u = (n: number, text: string, tSec: number): TranscriptItem => ({ id: `user_${n}`, role: "user", text, tSec });
const OPEN = "Hello, this is an automated assistant calling on behalf of Rice Robotics. This call may be recorded. Am I speaking with someone in accounts receivable at Acme?";
const ASK = "Thank you. Rice Robotics received a request to change Acme's bank account for payments. Did someone at Acme send that request?";

const denyT = [u(0, "Acme accounts receivable, this is Dana.", 1), a(1, OPEN, 3), u(2, "Yes, speaking.", 11), a(3, ASK, 13), u(4, "No, we haven't changed banks.", 22)];
const yesT = [...denyT.slice(0, 4), u(4, "Yes, that was us.", 22),
  a(5, "Thank you. For security, please tell me the last four digits of the new bank account number. I won't read any details back to you.", 24), u(6, "Four seven one one.", 33),
  a(7, "I heard four, seven, one, one. Is that right?", 35), u(8, "That's right.", 39),
  a(9, "Thank you. I've recorded your answer. Someone from Rice Robotics will follow up if anything else is needed. Goodbye.", 41)];

export const FIXTURES: Record<"deny" | "confirm", Fixture> = {
  deny: {
    steps: [{ dt: 800, status: "connected" }, { dt: 1500, transcript: denyT.slice(0, 2) }, { dt: 2500, transcript: denyT.slice(0, 4) },
      { dt: 2500, transcript: denyT }, { dt: 300, tool: { name: "report_answer", args: { answer: "no", speaker_role: "ar_or_finance" } } },
      { dt: 2500, transcript: [...denyT, a(5, "Thank you for telling us. We'll keep using the details we already have, and our team will look into the request. Goodbye.", 24)] },
      { dt: 1500, status: "ended" }],
    decide: { disconnectionReason: "agent_hangup", answers: [{ answer: "no", speakerRole: "ar_or_finance" }], challenges: [], flags: [], expectedLast4: "4711", secondReader: "no" },
  },
  confirm: {
    steps: [{ dt: 800, status: "connected" }, { dt: 1500, transcript: yesT.slice(0, 2) }, { dt: 2500, transcript: yesT.slice(0, 4) }, { dt: 2500, transcript: yesT.slice(0, 5) },
      { dt: 300, tool: { name: "report_answer", args: { answer: "yes", speaker_role: "ar_or_finance" } } }, { dt: 1500, transcript: yesT.slice(0, 7) },
      { dt: 300, tool: { name: "report_challenge", args: { digits: "4711", heard_text: "four seven one one" } } }, { dt: 2500, transcript: yesT }, { dt: 1500, status: "ended" }],
    decide: { disconnectionReason: "agent_hangup", answers: [{ answer: "yes", speakerRole: "ar_or_finance" }], challenges: [{ digits: "4711" }], flags: [], expectedLast4: "4711", secondReader: "yes" },
  },
};
