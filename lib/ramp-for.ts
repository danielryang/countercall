// lib/ramp-for.ts: the Ramp client for the current mode. Its own tiny module (no store, no call code) so routes can import it without pulling in a cycle.
import { env } from './env';
import { makeRamp, type MockSeed } from './ramp';
import { DbMockRampClient, type HoldClient } from './ramp.mock-db';
import type { Q } from './sink';

const EMPTY_SEED: MockSeed = { vendors: [], accounts: {}, contacts: {}, bills: [] };

/** The mock is bound to the given query function (so a release can run inside its transaction). Sandbox throws without credentials: fail closed. */
export function rampFor(q: Q): HoldClient {
  return env().RAMP_MODE === 'sandbox' ? makeRamp({ ...process.env, RAMP_MODE: 'sandbox' }, EMPTY_SEED) : new DbMockRampClient(q);
}
