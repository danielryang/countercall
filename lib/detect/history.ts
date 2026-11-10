// lib/detect/history.ts: the seeded inbox history. Benign mail from DIFFERENT vendors, so the queue reads like a real AP inbox where the detector does not flag
// everything. Same shape as fixtures/emails.json entries (fixtureToEmail / replayExtract work on it). Not part of the eval: the 20-fixture eval stays 20.
import { FIXTURES } from './fixtures';

type Fx = (typeof FIXTURES)[number];
const template = FIXTURES.find((f) => f.id.startsWith('07'))!;   // a clean invoice from a known contact, auth pass

const invoice = (id: string, vendor: string, from: { name: string; address: string }, subject: string, body: string, invoice_no: string, summary: string): Fx => ({
  id, label: `Seeded history: ${vendor}`,
  email: { ...template.email, from, subject, body },
  mock_extraction: { category: 'invoice_normal', is_payment_instruction_change: false, claimed_vendor: vendor, invoice_numbers: [invoice_no], summary },
  expected: { category: 'invoice_normal', bankChange: false, riskAtLeast: 'none', actions: [] },
});

export const HISTORY: Fx[] = [
  invoice('h1-kestrel', 'Kestrel Freight', { name: 'Kestrel Freight Billing', address: 'billing@kestrelfreight.com' }, 'Invoice KF-3302: freight, October lanes',
    'Hello,\n\nInvoice KF-3302 for $18,500.00 is attached for October freight, due Nov 17.\n\nRegards,\nKestrel Freight Billing', 'KF-3302', 'Freight invoice KF-3302, $18,500 due Nov 17.'),
  invoice('h2-summit', 'Summit Packaging Co', { name: 'Summit Packaging AR', address: 'ar@summitpackaging.com' }, 'Summit Packaging: invoice SP-1190',
    'Hi AP team,\n\nInvoice SP-1190 for $5,400.00 covers the November pallet order, due Nov 24. Let us know if you need a PO match.\n\nSummit Packaging AR', 'SP-1190', 'Packaging invoice SP-1190, $5,400 due Nov 24.'),
  FIXTURES.find((f) => f.id.startsWith('10'))!,    // Globex product newsletter: not an invoice, nothing to do
  invoice('h4-orchard', 'Orchard Office Supply', { name: 'Orchard Accounts', address: 'accounts@orchardoffice.com' }, 'Statement and invoice OO-5512',
    'Hello,\n\nPlease find invoice OO-5512 for $2,100.00 (office supplies), due Nov 30.\n\nOrchard Office Supply', 'OO-5512', 'Office supplies invoice OO-5512, $2,100 due Nov 30.'),
  FIXTURES.find((f) => f.id.startsWith('09'))!,    // Acme asks for a W-9: informational
];
