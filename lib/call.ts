// lib/call.ts: startCall, the ONLY dialer (08 section 3.7 P6). Never called from an event consumer, never from a request body.
// Order matters: kill switch -> state -> limits -> trusted contact -> challenge -> RESERVE the call row -> dial -> record the Retell id -> emit call.created.
// Every refusal ends in a human task (fail closed): the case never silently stalls.
import type { CallContext } from './detect/ingest';
import { mask, type EmittedEvent, type TaskKind } from './events';
import type { Q } from './sink';
import type { CaseForCall } from './voice/retell';

export const MAX_ATTEMPTS = 3;
const SEASONING_DAYS = 30;           // a number must have been on file this long (the DB trigger enforces the same rule)
const IN_FLIGHT_MINUTES = 10;
const CALLABLE_STATES = ['held', 'needs_human'];

export interface CallDeps {
  q: Q;
  emit: (e: EmittedEvent) => Promise<unknown>;
  createTask: (caseId: string, kind: TaskKind, title: string, reason: string) => Promise<void>;
  dial: (c: CaseForCall) => Promise<string>;      // startVerificationCall in production (it also enforces ALLOWED_DEMO_NUMBERS); a fake in tests
  callsEnabled: boolean;                          // CALLS_ENABLED: off in Production except for shoots and the live final
  perVendorHourLimit: number;                     // CALL_LIMIT_PER_VENDOR_HOUR (3)
  globalHourLimit?: number;                       // default 8
}
export type StartCallResult = { started: true; callId: string; attempt: number } | { started: false; reason: string };

/** Error text can contain a phone number (e.g. the allowlist guard). Tasks and events are public-read, so mask before storing. */
const safe = (s: string) => s.replace(/\+\d{8,15}/g, (m) => mask(m));

export async function startCall(d: CallDeps, caseId: string, vendorId: string, context: Pick<CallContext, 'vendorName' | 'requestSummary'>): Promise<StartCallResult> {
  const refuse = async (reason: string, task = true): Promise<StartCallResult> => {
    if (task) await d.createTask(caseId, 'verify_manually', 'Verify the bank change by phone', safe(reason));
    return { started: false, reason: safe(reason) };
  };

  if (!d.callsEnabled) return refuse('calls disabled (CALLS_ENABLED=0)');

  const [c] = await d.q<{ state: string; call_attempts: number; claimed_last4: string | null }>(`select state, call_attempts, claimed_last4 from cases where id = $1`, [caseId]);
  if (!c) return refuse('case not found', false);
  if (!CALLABLE_STATES.includes(c.state)) return refuse(`case is ${c.state}; not callable`, false);
  if (c.call_attempts >= MAX_ATTEMPTS) return refuse(`maximum ${MAX_ATTEMPTS} call attempts reached`);
  if ((await d.q(`select 1 from calls where case_id = $1 and ended_at is null and started_at > now() - make_interval(mins => $2) limit 1`, [caseId, IN_FLIGHT_MINUTES])).length) return refuse('a call for this case is already in progress', false);

  // Limits. Counters are fixed-window SQL (rate_limit_hit); a refused hit still counts, which is the safe direction.
  const hit = async (bucket: string) => Number((await d.q<{ n: number }>(`select rate_limit_hit($1, 3600) as n`, [bucket]))[0].n);
  if ((await hit(`call:v:${vendorId}`)) > d.perVendorHourLimit) return refuse(`more than ${d.perVendorHourLimit} calls to this vendor in the last hour`);
  if ((await hit('call:all')) > (d.globalHourLimit ?? 8)) return refuse('global hourly call limit reached');
  if ((await d.q(`select 1 from calls where ended_at is null and started_at > now() - make_interval(mins => $1) limit 1`, [IN_FLIGHT_MINUTES])).length) return refuse('another call is in flight');

  // Trust anchor: the vendor's PRIMARY trusted contact, seasoned. Never a number from the email, a prompt, a tool argument or a request body.
  const [contact] = await d.q<{ id: string; phone_e164: string }>(
    `select id, phone_e164 from trusted_contacts where vendor_id = $1 and is_primary and status = 'trusted' and first_seen_at <= now() - make_interval(days => $2)`, [vendorId, SEASONING_DAYS]);
  if (!contact) return refuse('no trusted, seasoned phone number on file for this vendor');

  // Challenge, derived server-side. Default: last 4 digits of the newest PAID invoice number (a fact only the vendor and we share).
  // Fallback: last 4 of the account number claimed in the email (proves less: the email contained it).
  const [paid] = await d.q<{ invoice_number: string }>(`select invoice_number from bills where vendor_id = $1 and paid_at is not null order by paid_at desc limit 1`, [vendorId]);
  const paidDigits = (paid?.invoice_number ?? '').replace(/\D/g, '');
  const challenge = paidDigits.length >= 4
    ? { kind: 'last_paid_invoice_last4' as const, expected: paidDigits.slice(-4), prompt: 'the last four digits of the invoice number on the most recent bill we paid you' }
    : c.claimed_last4 ? { kind: 'new_account_last4' as const, expected: c.claimed_last4.trim(), prompt: 'the last four digits of the new bank account number' } : null;
  if (!challenge) return refuse('no verification challenge available for this vendor');

  const [org] = await d.q<{ name: string }>(`select name from org`);
  let callRowId: string, attempt: number;
  try {   // reserve BEFORE dialing: unique(case_id, attempt) means a retried webhook cannot dial twice; calls_trust_guard is the second guard
    const [u] = await d.q<{ call_attempts: number }>(
      `update cases set challenge_kind = $2::challenge_kind, challenge_expected = $3, call_attempts = call_attempts + 1 where id = $1 returning call_attempts`, [caseId, challenge.kind, challenge.expected]);
    attempt = u.call_attempts;
    [{ id: callRowId }] = await d.q<{ id: string }>(`insert into calls (case_id, vendor_id, contact_id, attempt, mode) values ($1,$2,$3,$4,'phone') returning id`, [caseId, vendorId, contact.id, attempt]);
  } catch (err) {
    return refuse(`could not reserve the call: ${(err as Error).message}`);
  }

  let callId: string;
  try {
    callId = await d.dial({ caseId, attempt, trustedPhoneE164: contact.phone_e164, customerCompany: org?.name ?? 'the customer', vendorName: context.vendorName,
      requestSummary: context.requestSummary, challengePrompt: challenge.prompt });
  } catch (err) {
    await d.q(`update calls set ended_at = now(), disconnection_reason = 'dial_failed' where id = $1`, [callRowId]);
    return refuse(`dial failed: ${(err as Error).message}`);
  }
  await d.q(`update calls set retell_call_id = $1 where id = $2`, [callId, callRowId]);
  await d.emit({ type: 'call.created', caseId, callId, mode: 'phone', at: Date.now() });   // held -> calling
  return { started: true, callId, attempt };
}
