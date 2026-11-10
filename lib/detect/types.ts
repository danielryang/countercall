// src/types.ts - shared types. Everything downstream of normalize() sees only these.
export type Verdict = 'pass' | 'fail' | 'none' | 'neutral' | 'softfail' | 'temperror' | 'permerror';

export interface Addr { name?: string; address: string } // address is lowercased

export interface AuthResults {
  spf?: Verdict; dkim?: Verdict; dmarc?: Verdict;
  spfDomain?: string; dkimDomain?: string; dmarcDomain?: string;
  arcSealer?: string;
}

export interface NormalizedEmail {
  providerEventId: string;        // dedupe key (AgentMail event_id / Resend email_id / injector uuid)
  source: 'agentmail' | 'resend' | 'injector';
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  receivedAt: string;             // ISO
  from: Addr;
  replyTo: Addr[];
  to: string[];
  subject: string;
  body: string;                   // sanitized NEW content only (reply-extracted). ALL offsets index into this string.
  bodyFull: string;               // sanitized full text incl. quoted history (UI "show quoted")
  hiddenChars: number;            // zero-width / bidi / tag chars stripped from body
  htmlOnly: boolean;              // no text/plain part existed
  attachments: { filename?: string; contentType?: string; size: number }[];
  auth: AuthResults | null;       // null = provider gave us nothing (treat as unknown, not as pass)
  unauthenticatedLabel: boolean;  // AgentMail 'unauthenticated' label / event
  armor?: 'clear' | 'review' | 'unavailable' | 'pending'; // AgentMail Agent Armor verdict, if on
}

export interface Vendor {
  id: string;
  name: string;
  domains: string[];              // registrable domains on file
  knownContacts: string[];        // lowercased addresses seen before / on file
  trustedPhone: string;           // E.164, on file >= 30 days. THE ONLY NUMBER WE EVER DIAL.
  bank: { bankName: string; routing: string; accountLast4: string };
  openInvoices: { number: string; amountCents: number }[];
  typicalInvoiceCents: number;
  scheduledPaymentIds: string[];
}

export interface OrgConfig { domain: string; execNames: string[] } // execs whose names scammers impersonate

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export interface Span { start: number; end: number; label: string; source: 'rule' | 'llm'; reason?: string }

export type SignalId =
  | 'auth_dmarc_fail' | 'auth_spf_fail' | 'auth_dkim_fail' | 'auth_unauthenticated' | 'auth_unknown'
  | 'reply_to_mismatch' | 'reply_to_freemail'
  | 'lookalike_domain' | 'display_name_impersonation' | 'freemail_sender' | 'executive_impersonation'
  | 'sender_not_known_contact' | 'sender_domain_not_on_file'
  | 'bank_details_present' | 'routing_checksum_invalid' | 'bank_details_differ' | 'bank_details_match_on_file'
  | 'bank_change_language' | 'attachment_may_hold_details'
  | 'urgency_language' | 'secrecy_no_callback' | 'phone_in_email'
  | 'amount_outlier' | 'amount_mismatch_invoice'
  | 'injection_markers' | 'hidden_text';

export interface Signal { id: SignalId; severity: Severity; detail: string; spans: Span[] }

export interface Facts {
  routing?: { value: string; checksumOk: boolean };
  accountLast4?: string;
  iban?: string;
  phones: { e164: string; matchesOnFile: boolean }[];  // recorded for the audit log. NEVER dialed.
  amountsCents: number[];
  invoiceNumbers: string[];
}

export const EXTRACTION_CATEGORIES = [
  'bank_change', 'urgent_wire_request', 'executive_impersonation', 'gift_card_scam', 'invoice_normal',
  'vendor_info_request', 'newsletter_marketing', 'prompt_injection_attempt', 'other',
] as const;
export type Category = (typeof EXTRACTION_CATEGORIES)[number] | 'unclassified';

export interface Extraction {
  category: Exclude<Category, 'unclassified'>;
  is_payment_instruction_change: boolean;
  change_type: 'none' | 'new_bank_account' | 'remittance_address_change' | 'factoring_or_assignment' | 'payment_method_change' | 'other';
  claimed_vendor: string | null;
  new_bank: { bank_name: string | null; routing_number: string | null; account_last4: string | null; iban_present: boolean; details_in_attachment: boolean } | null;
  invoice_numbers: string[];
  urgency: 'none' | 'low' | 'high';
  pressure_not_to_call: boolean;
  callback_number_in_email: string | null;
  contains_instructions_to_ai: boolean;
  evidence: { quote: string; reason: string }[]; // offsets are computed by OUR code, never by the model
  summary: string;
}

export type Risk = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type Action =
  | { type: 'HOLD_VENDOR_PAYMENTS'; vendorId: string; paymentIds: string[] }
  | { type: 'START_CALLBACK'; vendorId: string; phone: string }   // phone is ALWAYS vendor.trustedPhone
  | { type: 'CREATE_HUMAN_TASK'; reason: string }
  | { type: 'FLAG_PHISHING' };

export interface Reason { code: string; text: string }

export interface Decision {
  category: Category;
  bankChange: boolean;
  risk: Risk;
  score: number;
  reasons: Reason[];
  actions: Action[];
  vendorId: string | null;
  llmStatus: 'ok' | 'unavailable';
}

export interface VendorMatch { vendor: Vendor; via: 'sender_domain' | 'known_contact' | 'lookalike_domain' | 'display_name' | 'body_mention' | 'llm_claimed_name' }
