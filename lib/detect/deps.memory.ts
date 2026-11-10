// src/deps.memory.ts - in-memory Deps: unit tests, the eval runner, and the "no database, offline demo" fallback.
import type { AppEvent, Deps } from './ingest';
import type { OrgConfig, Vendor } from './types';

export function memoryDeps(vendors: Vendor[], org: OrgConfig, extract?: Deps['extract']) {
  const events: AppEvent[] = [], seen = new Set<string>(), calls = new Set<string>(), holds: { vendorId: string; paymentIds: string[] }[] = [];
  let n = 100; const deps: Deps = {
    newCaseId: async () => `CC-${String(n++).padStart(4, '0')}`,
    seen: async (id) => (seen.has(id) ? true : (seen.add(id), false)),
    claimCallback: async (_c, v, k) => (calls.has(v + k) ? false : (calls.add(v + k), true)),
    emit: async (e) => void events.push(e),
    holdPayments: async (vendorId, paymentIds) => void holds.push({ vendorId, paymentIds }),
    createTask: async () => {}, startCall: async () => {},
    vendors: async () => vendors, org, extract,
  };
  return { deps, events, holds };
}
