// lib/cheat.ts: the callee cheat-cards for the demo panel, derived from the SAME scripted calls the tests and the simulator use
// (lib/voice/scenarios.ts), so what the teammate says on the phone is what the policy was proven against. Pure and browser-safe.
// The challenge answer is replaced before anything leaves this function: a sentinel goes in, CHEAT_DIGITS comes out.
import { CHEAT_DIGITS, SCENARIO_COPY, STAMP } from './copy';
import type { Outcome } from './voice/decide';
import { SCENARIOS, type Scenario } from './voice/scenarios';

export interface CheatCard {
  name: Scenario['name']; title: string; describes: string; tip: string; run: string | null;
  result: Outcome; resultWord: string; resultStatus: 'VERIFIED' | 'BLOCKED' | 'NEEDS_REVIEW';
  says: string[];   // what the callee says, in order
}

const SENTINEL = 'CHEAT_SECRET';

const ORDER: Scenario['name'][] = ['denied', 'confirmed', 'voicemail', 'vague', 'impostor', 'injection'];   // the hero take first

export function cheatCards(): CheatCard[] {
  return [...SCENARIOS].sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name)).map((s) => {
    const steps = s.build({ caseId: 'CC-0000', callId: 'cheat', expectedLast4: SENTINEL });
    let transcript: { role: 'agent' | 'user'; content: string }[] = [];
    for (const st of steps) if (st.kind === 'webhook' && st.payload.event === 'transcript_updated') transcript = st.payload.call.transcript_object ?? transcript;
    const says = transcript.filter((t) => t.role === 'user').map((t) => (t.content.includes(SENTINEL) ? CHEAT_DIGITS : t.content));
    const copy = SCENARIO_COPY[s.name]; const stamp = STAMP[s.expected.outcome];
    return { name: s.name, title: copy.title, describes: s.describes, tip: copy.tip, run: copy.run, result: s.expected.outcome, resultWord: stamp.word, resultStatus: stamp.status, says };
  });
}
