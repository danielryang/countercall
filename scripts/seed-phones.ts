// scripts/seed-phones.ts: write the teammates' REAL numbers (from env, never from git) over the 555 placeholders in the seed.
//   ACME_PHONE_E164 (falls back to CALLEE_PHONE_E164), ACME_BACKUP_PHONE_E164, NORTHWIND_PHONE_E164
// Then put the same numbers in ALLOWED_DEMO_NUMBERS: startVerificationCall refuses to dial anything else.
import { sql } from '../lib/store';
import { mask } from '../lib/events';

const E164 = /^\+[1-9][0-9]{7,14}$/;
const plan = [
  { name: 'Acme primary', vendor: 'v_acme', where: 'is_primary', phone: process.env.ACME_PHONE_E164 ?? process.env.CALLEE_PHONE_E164 },
  { name: 'Acme backup', vendor: 'v_acme', where: `label = 'AP backup line'`, phone: process.env.ACME_BACKUP_PHONE_E164 },
  { name: 'Northwind primary', vendor: 'v_northwind', where: 'is_primary', phone: process.env.NORTHWIND_PHONE_E164 },
];
const used: string[] = [];
for (const p of plan) {
  if (!p.phone) { console.log(`skip ${p.name}: not set`); continue; }
  if (!E164.test(p.phone)) throw new Error(`${p.name}: not E.164 (+15551234567)`);
  const r = await sql.unsafe(`update trusted_contacts set phone_e164 = $1 where vendor_id = $2 and ${p.where} returning id`, [p.phone, p.vendor]);
  console.log(`${p.name}: ${r.length} row(s) -> ${mask(p.phone)}`);
  used.push(p.phone);
}
console.log(`ALLOWED_DEMO_NUMBERS must contain exactly: ${used.length ? used.map(mask).join(', ') : '(none seeded)'}`);
await sql.end();
