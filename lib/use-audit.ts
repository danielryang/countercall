'use client';
// lib/use-audit.ts: the log check (GET /api/audit/verify) for the footer badge and the audit page. One shared store per tab, so both
// callers share one request. Asked on mount and when the event stream's lastSeq moves, at most once per 10 s (nextAuditFetch).
// In replay mode it never fetches: a recorded run is not the live log, and the UI says so instead of mixing the two.
import { useEffect, useSyncExternalStore } from 'react';
import type { AuditReport } from './audit';
import { nextAuditFetch } from './audit-view';

export type AuditStatus = 'loading' | 'ok' | 'error' | 'unauthorized';
export interface AuditSnapshot { status: AuditStatus; report: AuditReport | null }

let snap: AuditSnapshot = { status: 'loading', report: null };
let lastAt: number | null = null; let seqAtLast: number | null = null; let inflight = false;
let wantSeq = 0; let timer: ReturnType<typeof setTimeout> | null = null;
const subs = new Set<() => void>();
const set = (s: AuditSnapshot) => { snap = s; subs.forEach((f) => f()); };

function pump() {
  const step = nextAuditFetch({ now: Date.now(), lastAt, inflight, seq: wantSeq, seqAtLast });
  if (step === 'skip') return;
  if (typeof step === 'number') { if (!timer) timer = setTimeout(() => { timer = null; pump(); }, step); return; }
  inflight = true; lastAt = Date.now(); const seq = wantSeq;
  fetch('/api/audit/verify', { cache: 'no-store' })
    .then(async (r) => {
      if (r.ok) set({ status: 'ok', report: (await r.json()) as AuditReport });
      else set({ status: r.status === 401 ? 'unauthorized' : 'error', report: null });   // a failed check never leaves an old "sealed" on screen
    })
    .catch(() => set({ status: 'error', report: null }))
    .finally(() => { inflight = false; seqAtLast = seq; if (wantSeq > seq) pump(); });
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const get = () => snap;

/** `lastSeq` is the event stream's cursor; `replay` turns fetching off. */
export function useAudit({ lastSeq, replay }: { lastSeq: number; replay: boolean }): AuditSnapshot {
  const s = useSyncExternalStore(subscribe, get, get);
  useEffect(() => {
    if (replay) return;
    wantSeq = Math.max(wantSeq, lastSeq);
    pump();
  }, [lastSeq, replay]);
  return s;
}
