// scripts/demo-reset.ts (npm run demo:reset): same operation as POST /api/demo/reset, from the CLI.
import { resetDemo } from '../lib/demo';
import { sql } from '../lib/store';

console.log('reset', await resetDemo());
await sql.end();
