// lib/voice/retell.ts
// lib/voice/retell.ts — one client, one start function, one signature check.
import Retell from "retell-sdk";

let client: Retell | undefined;
export const retell = (): Retell => (client ??= new Retell({ apiKey: process.env.RETELL_API_KEY! }));   // lazy: see 08 section 0.5

export type CaseForCall = {
  caseId: string;
  attempt: number;                 // 1-based; part of the idempotency key
  trustedPhoneE164: string;        // from vendor master, NEVER from the email
  customerCompany: string;         // "Rice Robotics"
  vendorName: string;              // "Acme"
  requestSummary: string;          // built by code from structured fields, never free text from the email
  challengePrompt: string;         // "the last four digits of the new bank account number"
};

// read at call time, never at import (module-scope env breaks `next build` and tests)
const allowed = () => (process.env.ALLOWED_DEMO_NUMBERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function startVerificationCall(c: CaseForCall): Promise<string> {
  // Hard guard: nobody outside the allowlist can ever be dialed from this code path.
  if (!allowed().includes(c.trustedPhoneE164)) throw new Error(`refusing to dial ${c.trustedPhoneE164}: not on ALLOWED_DEMO_NUMBERS`);
  const call = await retell().call.createPhoneCall({
    from_number: process.env.RETELL_FROM_NUMBER!,
    to_number: c.trustedPhoneE164,
    override_agent_id: process.env.RETELL_AGENT_ID!,
    idempotency_key: `case-${c.caseId}-attempt-${c.attempt}`, // 5-255 chars [A-Za-z0-9_-]; safe to retry on timeout
    // string values only; ONLY non-secret, code-generated text goes here (it lands in the LLM prompt)
    retell_llm_dynamic_variables: {
      customer_company: c.customerCompany,
      vendor_name: c.vendorName,
      request_summary: c.requestSummary,
      challenge_prompt: c.challengePrompt,
    },
    // not shown to the LLM; echoed back in webhooks and tool calls so we can look the case up
    metadata: { case_id: c.caseId, attempt: c.attempt, mode: "phone" },
  });
  return call.call_id;
}

/** Verify X-Retell-Signature on the RAW body. Works for webhooks AND custom-function calls. */
export async function verifyRetell(raw: string, req: Request): Promise<boolean> {
  const sig = req.headers.get("x-retell-signature");
  // the key must be the one with the "webhook" badge in Dashboard > API Keys
  return !!sig && (await Retell.verify(raw, process.env.RETELL_API_KEY!, sig));
}
