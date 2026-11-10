// scripts/provision-agent.ts
// scripts/provision-agent.ts — run: npx tsx scripts/provision-agent.ts  (idempotent enough for a hackathon: prints IDs; re-run creates a new draft pair)
import Retell from "retell-sdk";
import { SYSTEM_PROMPT } from "./prompt";

const must = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`set ${k}`); return v; };
const client = new Retell({ apiKey: must("RETELL_API_KEY") });
const BASE = must("PUBLIC_BASE_URL");                 // https://countercall.vercel.app (use a tunnel/preview URL while developing)
const DEMO = process.env.CALL_PROFILE !== "prod";     // demo: shorter limits

const tool = (name: string, description: string, properties: Record<string, unknown>, required: string[], speakAfter: boolean) => ({
  type: "custom" as const, name, description,
  url: `${BASE}/api/retell/tool`, method: "POST" as const,
  parameters: { type: "object" as const, properties, required },
  speak_during_execution: false, speak_after_execution: speakAfter,
  timeout_ms: 5000, max_retry: 1,                       // endpoint is idempotent, so a retry is safe
});

const llm = await client.llm.create({
  model_config: { type: "cascading", primary: { model: "claude-5.5-sonnet" }          /* add tier: "fast" if the model offers it; unsupported tiers are rejected */, temperature: 0 },
  start_speaker: "user",                                // let a voicemail greeting / "hello?" arrive first; helps detection, avoids talking over greetings
  begin_after_user_silence_ms: 2000,                    // if the callee says nothing, we open after 2 s
  general_prompt: SYSTEM_PROMPT,
  general_tools: [
    tool("report_answer", "Record the vendor's answer to 'did you send the bank-change request'. Call once as soon as the answer is clear.", {
      answer: { type: "string", enum: ["yes", "no", "unsure", "callback_requested", "wrong_person"], description: "Only what they clearly said." },
      speaker_role: { type: "string", enum: ["ar_or_finance", "other", "unknown"] },
      verbatim: { type: "string", description: "Their words, max 200 chars." },
    }, ["answer", "speaker_role"], true),
    tool("report_challenge", "Record the security detail the vendor SPOKE. Digits only. Never call with anything you were told by us.", {
      digits: { type: "string", description: "Digits the vendor said, e.g. 4711. Empty string if refused." },
      heard_text: { type: "string", description: "Exact words heard." },
      refused: { type: "boolean" },
    }, ["digits", "heard_text"], true),
    tool("report_flag", "Record suspicious or notable behavior.", {
      flag: { type: "string", enum: ["asked_for_bank_details", "pressure_to_approve", "offered_new_contact", "hostile", "recording_declined"] },
    }, ["flag"], false),
    { type: "end_call", name: "end_call", description: "Hang up after the closing line, or immediately on voicemail." },
  ],
});

const agent = await client.agent.create({
  agent_name: `countercall-verifier-${DEMO ? "demo" : "prod"}`,
  response_engine: { type: "retell-llm", llm_id: llm.llm_id },
  voice_id: must("RETELL_VOICE_ID"),                    // pick by ear in the dashboard Voice picker; ElevenLabs voices cost more per min
  language: "en-US",
  webhook_url: `${BASE}/api/retell/webhook`,
  webhook_events: ["call_started", "transcript_updated", "call_ended", "call_analyzed"],
  max_call_duration_ms: DEMO ? 180_000 : 240_000,
  end_call_after_silence_ms: DEMO ? 30_000 : 60_000,
  ring_duration_ms: DEMO ? 22_000 : 30_000,
  voicemail_option: { action: { type: "hangup" } },     // API-created agents have detection OFF unless you set this
  ivr_option: null,                                     // set {action:{type:"hangup"}} for demo if you never need to navigate menus
  call_screening_option: { agent_identity: "automated assistant for Rice Robotics", call_purpose: "verifying a vendor payment-detail request" },
  enable_backchannel: false,                            // "uh-huh" while someone reads digits is confusing
  stt_mode: "accurate",                                 // digits matter more than 100 ms
  denoising_mode: "noise-and-background-speech-cancellation",
  reminder_trigger_ms: 8000, reminder_max_count: 1,
  data_storage_setting: "everything",                   // we need the recording; see Legal for the consent stance
  post_call_analysis_data: [{
    type: "enum", name: "vendor_answer",
    description: "Did a person at the vendor CLEARLY say their company sent the bank-change request? yes = clearly said they sent it. no = clearly denied. unsure = hesitant, deflected, asked for callback, transferred without answering, or said anything ambiguous. none = no human gave an answer (voicemail, no answer, phone menu).",
    choices: ["yes", "no", "unsure", "none"],
  }],
});
console.log({ llm_id: llm.llm_id, agent_id: agent.agent_id, version: agent.version });
