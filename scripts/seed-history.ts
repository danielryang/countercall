// scripts/seed-history.ts (npm run seed:history): so the queue is not empty on first load. Runs the benign fixtures through the REAL ingestEmail
// with recorded extractions (no LLM call, no variance), then stamps those cases source='seed' so demo:reset keeps them.
import { getDeps } from '../lib/detect/deps';
import { FIXTURES, fixtureToEmail, replayExtract } from '../lib/detect/fixtures';
import { ingestEmail } from '../lib/detect/ingest';
import { sql } from '../lib/store';

const force = process.argv.includes('--force');
const [{ n }] = await sql`select count(*)::int as n from cases where source = 'seed'`;
if (n > 0 && !force) { console.log(`${n} seeded case(s) already exist; use --force to add more`); await sql.end(); process.exit(0); }

const benign = FIXTURES.filter((f) => f.expected.actions.length === 0);   // the PASS cases: 07, 09, 10, 19
const caseIds: string[] = [];
for (const f of benign) {
  const email = fixtureToEmail(f);
  const deps = await getDeps({ provider: 'seed', payload: { fixtureId: f.id } });
  await ingestEmail(email, { ...deps, extract: replayExtract(f) });
  const [c] = await sql`select id from cases where email_provider_event_id = ${email.providerEventId}`;
  if (c) caseIds.push(c.id as string);
}
await sql`update cases set source = 'seed' where id = any(${caseIds})`;
console.log(`seeded ${caseIds.length} cleared cases: ${caseIds.join(', ')}`);
await sql.end();
