// src/deps.ts - ARCHITECT SWAPS THIS for the real DB + Ramp client. Until then the app runs end to end in memory.
import { readFileSync } from 'node:fs';
import { memoryDeps } from './deps.memory';
import type { Deps } from './ingest';
import type { OrgConfig, Vendor } from './types';

let cached: Deps | undefined;
export function getDeps(): Deps {
  if (!cached) {
    const { org, vendors } = JSON.parse(readFileSync(process.cwd() + '/fixtures/vendors.json', 'utf8')) as { org: OrgConfig; vendors: Vendor[] };
    cached = memoryDeps(vendors, org).deps;
  }
  return cached;
}
