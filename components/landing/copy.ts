// components/landing/copy.ts: every word on the landing page (/). Kept apart from lib/copy.ts so landing edits never collide with app copy.
// Truthfulness (CLAUDE.md): stats only from README section 10 with their sources; Ramp is a mock here; prior art is conceded; the hero is an illustration.

export const REPO_URL = 'https://github.com/danielryang/countercall';
/** The recorded real call (public/runs/fraud-live.json). app/page.tsx imports that file, so the build fails if it is missing. */
export const RECORDED_RUN = 'fraud-live';
export const RECORDED_RUN_HREF = `/cases?replay=${RECORDED_RUN}`;
export const LIVE_QUEUE_HREF = '/cases';

export const STRIP = 'BBS x Ramp hackathon build · Rice Robotics and Acme are fictional · no real money moves';

export const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#call', label: 'The call' },
  { href: '#trust', label: 'Trust model' },
  { href: '#ramp', label: 'Ramp' },
] as const;

export const HERO = {
  eyebrow: 'Vendor bank-change fraud · accounts payable',
  title: 'Call the number you already have.',
  sub: 'CounterCall reads every bank-change email, puts the payment on hold, and phones the vendor on the number from your records. Only a person can release the money.',
  primary: 'Watch a recorded real run',
  secondary: 'Open the live queue',
  primaryNote: 'No sign-in. A real call, replayed and labelled REPLAY.',
};

/** The hero scene: lines from the recorded run (CC-0108). The number on file is the seeded Acme line, masked as the app masks it. */
export const SCENE = {
  label: 'Replay · an illustration built from a recorded run',
  aria: 'Animated walkthrough: a bank-change email arrives, the two Acme payments are put on hold, CounterCall calls the number already on file instead of anything in the email, the vendor says they did not change banks, and the change is blocked.',
  email: { from: 'Acme Corp Billing', address: 'acme.billing.dept@gmail.com', subject: 'Important: Change of bank details', quote: '“We have changed banks. Please send this month’s payment to our new account.”' },
  held: { vendor: 'Acme Corp · invoices 4471, 4472', amount: '$24,800.00', note: 'Both payments frozen before anyone can send them' },
  dial: { never: 'Reply to the email', neverNote: 'never used', onFile: '+1 ••• ••• ••42', onFileNote: 'on file since 2025-03-14 · signed W-9' },
  agent: 'Did someone at Acme Corp send that request?',
  vendor: 'No, we haven’t changed banks.',
  result: '$24,800.00 stays on hold. The bank change is rejected.',
  steps: ['Email', 'Hold', 'Number', 'Call', 'Result'],
};

export const PROBLEM = {
  eyebrow: 'The problem',
  title: ['One forged email.', 'One wire.', 'No way back.'],
  lead: 'Vendor bank-change fraud works because the request and the new bank details arrive in the same email. Whoever approves the change is trusting the channel the attacker controls.',
  stats: [
    { value: '74%', label: 'of organizations were affected by business email compromise in 2025.', note: 'AFP’s detail table gives 70%.', ref: 1 },
    { value: '20%', label: 'of organizations hit by payments fraud recovered nothing. 30% recovered most of it.', note: 'Most = more than 75%.', ref: 1 },
    { value: '$3.05B', label: 'in reported business email compromise losses in 2025, across 24,768 complaints.', note: null, ref: 2 },
  ],
  sources: [
    { n: 1, text: 'AFP 2026 Payments Fraud and Control Survey, press release 2026-04-14', href: 'https://www.financialprofessionals.org/about/learn-more/press-releases/Details/over-75-percent-of-us-firms-experienced-payments-fraud-in-2025-while-ai-adoption-for-fraud-mitigation-lags' },
    { n: 2, text: 'FBI IC3 2025 Annual Report', href: 'https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf' },
  ],
};

export const HOW = {
  eyebrow: 'How it works',
  title: 'Four steps. One of them is a phone call.',
  steps: [
    { n: '01', title: 'Detect', body: 'Reads the accounts-payable inbox. When an email asks to change bank details, rules and a model each check it (either can flag it) and the suspicious lines are highlighted.' },
    { n: '02', title: 'Hold', body: 'The vendor’s scheduled payments are put on hold before anyone can send them. The amount stays visible, frozen, with the reason.' },
    { n: '03', title: 'Call', body: 'Phones the vendor on the number already on file, never one from the email, says it is automated, and asks one question: did you send this?' },
    { n: '04', title: 'Decide', body: 'Code, not the model, reads the answer. A no blocks the change. A yes with the right detail waits for a person. Anything unclear goes to a person.' },
  ],
  diff: { onFile: 'Embarcadero Community Bank ••••4417', inEmail: 'Bluebird Neobank ••••4321', onFileLabel: 'On file', inEmailLabel: 'In the email' },
  number: { label: 'Dialed', value: '+1 ••• ••• ••42', note: 'From the signed W-9, 2025-03-14. Not from this email.' },
  decide: 'Only a person can release money. CounterCall never does it on its own.',
};

export const CALL = {
  eyebrow: 'The call',
  title: 'Three ways a call ends.',
  lead: 'The agent says it is automated, asks one question and writes down what it hears. What happens next is a fixed policy in code, not improvisation.',
  replay: 'Play again',
  agent: 'CounterCall',
  vendor: 'Acme',
  policy: 'What the policy decided',
  rows: { outcome: 'Result', reason: 'Why', money: 'The money' },
};

export const TRUST = {
  eyebrow: 'Trust model',
  title: 'The scammer controls the email. They don’t control the phone line.',
  rules: [
    { title: 'The number comes from your records.', body: 'Never from the email, a signature, a link or anything the model says. The dialer refuses any number not on file for that vendor for at least 30 days.' },
    { title: 'Nothing is paid until a person says so.', body: 'A confirmed call only moves the case to “waiting for approval”. Release is a human hold-to-confirm, signed with a name.' },
    { title: 'Silence is not consent.', body: 'No answer, voicemail, a vague answer or a wrong person keeps the money held and opens a task for a person.' },
  ],
  limit: 'Limit: if the vendor record itself was already poisoned, the call reaches the wrong person. That is why a number added in the last 30 days is never dialed.',
  priorTitle: 'Not a new idea, and we say so.',
  prior: 'Calling the vendor back on a known number is standard practice: 94% of organizations already call back on a number from their records (AFP 2026). Others automate parts of it too: nsKnox’s AI Agent Caller, Trouvé, and CallbackProof. What we add is the hold, a number with provenance, a challenge never read aloud, a decision made by code, and human-only release, checked across 20,995,238 enumerated policy cases with 0 unsafe releases.',
  priorSource: { text: 'AFP 2026 key highlights', href: 'https://www.truist.com/content/dam/truist-bank/us/en/documents/info/cci/2026-afp-payments-fraud-control-survey-report-key-highlights.pdf' },
};

export const RAMP = {
  eyebrow: 'Where it sits',
  title: 'Ramp pays the bill. CounterCall decides whether it should.',
  chip: 'Ramp mock',
  truth: 'Built against the shape of Ramp’s Developer API. In this demo it runs in mock mode: no Ramp account is touched and no money moves.',
  nodes: [
    { title: 'Bill due in Ramp', api: 'GET /bills?vendor_id=' },
    { title: 'Hold bill and vendor', api: 'POST /bills/{id}/hold · /vendors/{id}/hold' },
    { title: 'Call the number on file', api: 'CounterCall · Retell', ours: true },
    { title: 'A person releases, or it stays held', api: 'POST /bills/{id}/release' },
  ],
  note: 'A vendor hold can come back as 202, pending approval. CounterCall treats that as not yet held and keeps watching.',
  trademark: 'Ramp is a trademark of its owner. CounterCall is a hackathon project, not affiliated with or endorsed by Ramp.',
};

export const CTA = {
  title: 'Stop paying scammers.',
  primary: 'Watch a recorded real run',
  code: 'Read the code',
  fine: 'BBS x Ramp “Automate the Old Way” · technical track · fictional customer and vendor · no real payments moved',
  team: 'Built by Daniel Yang and Eric Kim',
  license: 'MIT license',
  themes: 'Theme',
};
