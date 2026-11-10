// lib/voice/decide.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { decideOutcome, type DecideInput } from "./decide";

const base: DecideInput = {
  disconnectionReason: "agent_hangup", answers: [], challenges: [], flags: [],
  expectedLast4: "4711", secondReader: "yes",
};
const yes = { answer: "yes", speakerRole: "ar_or_finance" } as const;
const no = { answer: "no", speakerRole: "ar_or_finance" } as const;

const cases: [string, Partial<DecideInput>, string, string][] = [
  ["yes + matching challenge + second reader yes", { answers: [yes], challenges: [{ digits: "4711" }] }, "CONFIRMED_LEGIT", "CHALLENGE_MATCHED"],
  ["yes, full account spoken, last4 matches", { answers: [yes], challenges: [{ digits: "000 123 4711" }] }, "CONFIRMED_LEGIT", "CHALLENGE_MATCHED"],
  ["yes, wrong digits (tampered request)", { answers: [yes], challenges: [{ digits: "9999" }] }, "UNVERIFIED", "CHALLENGE_MISMATCH"],
  ["yes, wrong then right (ASR fix) within 2 tries", { answers: [yes], challenges: [{ digits: "4717" }, { digits: "4711" }] }, "CONFIRMED_LEGIT", "CHALLENGE_MATCHED"],
  ["third attempt ignored (brute force)", { answers: [yes], challenges: [{ digits: "1" }, { digits: "2" }, { digits: "4711" }] }, "UNVERIFIED", "CHALLENGE_MISMATCH"],
  ["yes, refused challenge", { answers: [yes], challenges: [{ digits: "" }] }, "UNVERIFIED", "CHALLENGE_NOT_GIVEN"],
  ["yes, no challenge at all", { answers: [yes] }, "UNVERIFIED", "CHALLENGE_NOT_GIVEN"],
  ["yes + match but asked for bank details", { answers: [yes], challenges: [{ digits: "4711" }], flags: ["asked_for_bank_details"] }, "UNVERIFIED", "SUSPICIOUS_BEHAVIOR"],
  ["yes + match but second reader says unsure", { answers: [yes], challenges: [{ digits: "4711" }], secondReader: "unsure" }, "UNVERIFIED", "SECOND_READER_DISAGREES"],
  ["yes + match but analysis missing", { answers: [yes], challenges: [{ digits: "4711" }], secondReader: null }, "UNVERIFIED", "ANALYSIS_MISSING"],
  ["AR says no", { answers: [no] }, "DENIED_FRAUD", "VENDOR_DENIED"],
  ["non-AR says no", { answers: [{ answer: "no", speakerRole: "other" }] }, "UNVERIFIED", "WRONG_PERSON"],
  ["yes and no", { answers: [yes, no], challenges: [{ digits: "4711" }] }, "UNVERIFIED", "CONFLICTING_ANSWERS"],
  ["unsure", { answers: [{ answer: "unsure", speakerRole: "unknown" }] }, "UNVERIFIED", "UNSURE"],
  ["callback requested", { answers: [{ answer: "callback_requested", speakerRole: "other" }] }, "UNVERIFIED", "CALLBACK_REQUESTED"],
  ["voicemail", { disconnectionReason: "voicemail_reached" }, "UNVERIFIED", "VOICEMAIL"],
  ["no answer", { disconnectionReason: "dial_no_answer" }, "UNVERIFIED", "NO_ANSWER"],
  ["user hung up with no answer recorded", { disconnectionReason: "user_hangup" }, "UNVERIFIED", "NO_RESULT"],
  ["recording declined beats everything", { answers: [yes], challenges: [{ digits: "4711" }], flags: ["recording_declined"] }, "UNVERIFIED", "RECORDING_DECLINED"],
  ["bad expected value fails closed", { expectedLast4: "", answers: [yes], challenges: [{ digits: "4711" }] }, "UNVERIFIED", "NO_RESULT"],
];
for (const [name, patch, outcome, reason] of cases) {
  test(name, () => {
    const d = decideOutcome({ ...base, ...patch });
    assert.equal(d.outcome, outcome);
    assert.equal(d.reason, reason);
    // invariant: only CONFIRMED_LEGIT can ever be anything but plain HELD, and even it needs a human
    assert.equal(d.paymentState, outcome === "CONFIRMED_LEGIT" ? "HELD_AWAITING_HUMAN_APPROVAL" : "HELD");
  });
}
