// Pure reducer: same code path for live events, snapshot catch-up and recorded-run replay.
export type Ev = { seq: number; type: string; case_id: string; ts: string; payload: any };
export type Turn = { id: string; speaker: 'agent' | 'callee'; text: string; final: boolean };
export type CaseView = {
  id: string; status: 'scanning' | 'flagged' | 'cleared' | 'calling' | 'verified' | 'fraud' | 'unverified' | 'released';
  payments: Record<string, { id: string; amount_cents: number; state: 'held' | 'released' }>;
  call: { status: string; turns: Turn[]; outcome?: string } | null;
  lastSeq: number;
};
export type State = { cases: Record<string, CaseView>; lastSeq: number };
export const initial: State = { cases: {}, lastSeq: 0 };

const blank = (id: string): CaseView => ({ id, status: 'scanning', payments: {}, call: null, lastSeq: 0 });

export function apply(s: State, e: Ev): State {
  if (e.type === 'system.reset') return { ...initial, lastSeq: e.seq }; // keep seq so late/duplicate pre-reset events stay ignored
  if (e.seq <= s.lastSeq) return s; // duplicate / replayed-after-snapshot: idempotent
  const c = s.cases[e.case_id] ?? blank(e.case_id);
  const p = e.payload;
  let next: CaseView = c;
  switch (e.type) {
    case 'case.flagged': next = { ...c, status: 'flagged' }; break;
    case 'case.cleared': next = { ...c, status: 'cleared' }; break;
    case 'payment.held': next = { ...c, payments: { ...c.payments, [p.payment_id]: { id: p.payment_id, amount_cents: p.amount_cents, state: 'held' } } }; break;
    case 'payment.released': next = { ...c, status: 'released', payments: { ...c.payments, [p.payment_id]: { ...c.payments[p.payment_id], state: 'released' } } }; break;
    case 'call.status': next = { ...c, status: c.status === 'flagged' ? 'calling' : c.status, call: { turns: [], ...c.call, status: p.status } }; break;
    case 'call.transcript.delta': {
      const turns = c.call?.turns ?? [];
      const i = turns.findIndex((t) => t.id === p.turn_id);
      const prev = i >= 0 ? turns[i] : { id: p.turn_id, speaker: p.speaker, text: '', final: false };
      const merged: Turn = { ...prev, text: p.mode === 'replace' ? p.text : prev.text + p.text, final: p.final };
      const nt = i >= 0 ? turns.map((t, j) => (j === i ? merged : t)) : [...turns, merged];
      next = { ...c, call: { status: c.call?.status ?? 'connected', ...c.call, turns: nt } };
      break;
    }
    case 'call.outcome': next = { ...c, status: ({ VERIFIED: 'verified', FRAUD: 'fraud', UNVERIFIED: 'unverified' } as const)[p.outcome as 'VERIFIED'], call: { status: 'ended', turns: [], ...c.call, outcome: p.outcome } }; break;
    default: break; // unknown types are ignored, still advance lastSeq (forward-compatible)
  }
  return { cases: { ...s.cases, [e.case_id]: { ...next, lastSeq: e.seq } }, lastSeq: e.seq };
}
