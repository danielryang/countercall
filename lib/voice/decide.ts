// lib/voice/decide.ts
// lib/voice/decide.ts — deterministic policy. The LLM only reports; this decides.
export type Outcome = "CONFIRMED_LEGIT" | "DENIED_FRAUD" | "UNVERIFIED";
export type Reason =
  | "CHALLENGE_MATCHED" | "VENDOR_DENIED"
  | "CHALLENGE_MISMATCH" | "CHALLENGE_NOT_GIVEN"
  | "SUSPICIOUS_BEHAVIOR" | "CONFLICTING_ANSWERS" | "SECOND_READER_DISAGREES" | "ANALYSIS_MISSING"
  | "UNSURE" | "WRONG_PERSON" | "CALLBACK_REQUESTED" | "RECORDING_DECLINED"
  | "NO_ANSWER" | "BUSY" | "VOICEMAIL" | "IVR_ONLY" | "TIME_LIMIT" | "CALL_FAILED" | "NO_RESULT";
export type Answer = "yes" | "no" | "unsure" | "callback_requested" | "wrong_person";
export type SpeakerRole = "ar_or_finance" | "other" | "unknown";
export type Flag =
  | "asked_for_bank_details" | "pressure_to_approve" | "offered_new_contact" | "hostile" | "recording_declined";

export interface DecideInput {
  disconnectionReason: string | null;             // Retell disconnection_reason
  answers: { answer: Answer; speakerRole: SpeakerRole }[];
  challenges: { digits: string }[];               // in order; only first 2 are honored
  flags: Flag[];
  expectedLast4: string;                          // from our DB — never from the LLM, never in the prompt
  secondReader: "yes" | "no" | "unsure" | "none" | null; // post-call analysis; null = not arrived
}
export interface Decision {
  outcome: Outcome;
  reason: Reason;
  severity: "low" | "medium" | "high";
  challengeMatched: boolean | null;
  flags: Flag[];
  // No "RELEASED" value exists on purpose: nothing in this module can release money.
  paymentState: "HELD" | "HELD_AWAITING_HUMAN_APPROVAL";
}

const TELEPHONY: Record<string, Reason> = {
  dial_no_answer: "NO_ANSWER", user_declined: "NO_ANSWER", dial_busy: "BUSY",
  voicemail_reached: "VOICEMAIL", ivr_reached: "IVR_ONLY",
  inactivity: "TIME_LIMIT", max_duration_reached: "TIME_LIMIT",
};
const MAX_CHALLENGE_ATTEMPTS = 2;
const SUSPICIOUS: Flag[] = ["asked_for_bank_details", "pressure_to_approve", "offered_new_contact"];

export function decideOutcome(i: DecideInput): Decision {
  const flags = [...new Set(i.flags)];
  const mk = (outcome: Outcome, reason: Reason, severity: Decision["severity"], challengeMatched: boolean | null = null): Decision => ({
    outcome, reason, severity, challengeMatched, flags,
    paymentState: outcome === "CONFIRMED_LEGIT" ? "HELD_AWAITING_HUMAN_APPROVAL" : "HELD",
  });
  const unverified = (r: Reason, s: Decision["severity"] = "medium", m: boolean | null = null) => mk("UNVERIFIED", r, s, m);

  if (!/^\d{4}$/.test(i.expectedLast4)) return unverified("NO_RESULT", "high");
  if (flags.includes("recording_declined")) return unverified("RECORDING_DECLINED", "low");

  const said = new Set(i.answers.map((a) => a.answer));
  if (said.size === 0) {
    const r = i.disconnectionReason ?? "";
    return unverified(TELEPHONY[r] ?? (r.startsWith("dial_") || r.startsWith("error_") ? "CALL_FAILED" : "NO_RESULT"), "low");
  }
  if (said.has("yes") && said.has("no")) return unverified("CONFLICTING_ANSWERS", "high");

  if (said.has("no")) {
    const authoritative = i.answers.some((a) => a.answer === "no" && a.speakerRole === "ar_or_finance");
    return authoritative ? mk("DENIED_FRAUD", "VENDOR_DENIED", "high") : unverified("WRONG_PERSON");
  }

  if (said.has("yes")) {
    const tries = i.challenges.slice(0, MAX_CHALLENGE_ATTEMPTS).map((c) => c.digits.replace(/\D/g, ""));
    if (tries.every((d) => d === "")) return unverified("CHALLENGE_NOT_GIVEN", "high");
    const matched = tries.some((d) => d.length >= 4 && d.slice(-4) === i.expectedLast4);
    if (!matched) return unverified("CHALLENGE_MISMATCH", "high", false);
    if (flags.some((f) => SUSPICIOUS.includes(f))) return unverified("SUSPICIOUS_BEHAVIOR", "high", true);
    if (i.secondReader === null) return unverified("ANALYSIS_MISSING", "medium", true);
    if (i.secondReader !== "yes") return unverified("SECOND_READER_DISAGREES", "high", true);
    return mk("CONFIRMED_LEGIT", "CHALLENGE_MATCHED", "low", true);
  }

  if (said.has("callback_requested")) return unverified("CALLBACK_REQUESTED", "low");
  if (said.has("wrong_person")) return unverified("WRONG_PERSON", "low");
  return unverified("UNSURE", "medium");
}
