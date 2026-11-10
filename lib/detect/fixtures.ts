// src/fixtures.ts - fixture -> NormalizedEmail, shared by the eval runner, the injector route and the dashboard "Simulate email" server action.
import { randomUUID } from 'node:crypto';
import emails from '../../fixtures/emails.json';
import { ExtractionSchema, finalize, type ExtractResult } from './extract';
import { ingestEmail, type Deps } from './ingest';
import type { Extraction, NormalizedEmail } from './types';

export const FIXTURES = emails as any[];
const DEFAULTS: Extraction = { category: 'other', is_payment_instruction_change: false, change_type: 'none', claimed_vendor: null, new_bank: null, invoice_numbers: [], urgency: 'none', pressure_not_to_call: false, callback_number_in_email: null, contains_instructions_to_ai: false, evidence: [], summary: '' };

/** fresh = new ids every call, so you can fire the same fixture ten times for retakes without the dedupe swallowing it */
export function fixtureToEmail(f: any, fresh = true): NormalizedEmail {
  const id = fresh ? randomUUID() : f.id;
  return { providerEventId: `inj-${id}`, source: 'injector', messageId: `<${id}@injector.local>`, receivedAt: new Date().toISOString(),
    bodyFull: f.email.body, hiddenChars: 0, htmlOnly: false, unauthenticatedLabel: false, ...f.email };
}

/** Offline / deterministic retakes: use the recorded extraction instead of calling Claude (zero latency, zero variance). */
export const replayExtract = (f: any) => async (e: NormalizedEmail): Promise<ExtractResult> => ({ ...finalize(ExtractionSchema.parse({ ...DEFAULTS, ...f.mock_extraction }), e.body), ms: 0 });

export async function injectFixture(id: string, deps: Deps, opts: { replay?: boolean } = {}) {
  const f = FIXTURES.find((x) => x.id === id);
  if (!f) throw new Error(`unknown fixture ${id}`);
  return ingestEmail(fixtureToEmail(f), opts.replay ? { ...deps, extract: replayExtract(f) } : deps);
}
