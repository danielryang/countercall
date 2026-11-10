// lib/preflight.ts: "is the system ready to demo?" as plain checks. Pure: the route gathers the facts, this decides what they mean.
// Booleans and counts only. Never a secret, a phone number or a key.
export interface PreflightFacts {
  dbOk: boolean; lastSeq: number | null; openCases: number;
  callsEnabled: boolean; rampMode: 'mock' | 'sandbox'; allowedNumbers: number; allowedSenders: number;
  has: { anthropic: boolean; retellKey: boolean; retellAgent: boolean; retellFrom: boolean; agentmailKey: boolean; agentmailSecret: boolean };
}
export type Level = 'ok' | 'warn' | 'fail';
export interface Check { id: string; label: string; level: Level; detail: string }

const yes = (b: boolean, ok: string, bad: string, level: Level = 'fail'): Pick<Check, 'level' | 'detail'> => (b ? { level: 'ok', detail: ok } : { level, detail: bad });

export function buildChecks(f: PreflightFacts): Check[] {
  return [
    { id: 'db', label: 'Database', ...yes(f.dbOk, `Connected, ${f.lastSeq ?? 0} events recorded`, 'Cannot reach the database') },
    { id: 'ai', label: 'AI detection key', ...yes(f.has.anthropic, 'Anthropic key present', 'No Anthropic key: emails cannot be classified') },
    { id: 'mail', label: 'Inbound email', ...yes(f.has.agentmailKey && f.has.agentmailSecret, 'AgentMail key and webhook secret present', 'AgentMail key or webhook secret missing: real emails will not arrive') },
    { id: 'senders', label: 'Allowed senders', ...yes(f.allowedSenders > 0, `${f.allowedSenders} sender${f.allowedSenders === 1 ? '' : 's'} may trigger a hold`, 'No sender may trigger a hold (injected emails still work)', 'warn') },
    { id: 'ramp', label: 'Ramp', level: f.rampMode === 'mock' ? 'ok' : 'warn', detail: f.rampMode === 'mock' ? 'Mock (clearly labelled in the app)' : 'Sandbox: needs Ramp credentials' },
    { id: 'voice', label: 'Voice agent', ...yes(f.has.retellKey && f.has.retellAgent && f.has.retellFrom, 'Retell key, agent and number present', 'Retell key, agent id or from-number missing: calls cannot be placed', f.callsEnabled ? 'fail' : 'warn') },
    { id: 'callee', label: 'Callee allowlist', ...yes(f.allowedNumbers > 0, `${f.allowedNumbers} number${f.allowedNumbers === 1 ? '' : 's'} allowed to be called`, 'No callable number: every call will be refused', f.callsEnabled ? 'fail' : 'warn') },
    { id: 'calls', label: 'Phone calls', level: f.callsEnabled ? 'ok' : 'warn', detail: f.callsEnabled ? 'ON: a flagged case will really ring the callee' : 'OFF (CALLS_ENABLED=0): flagged cases stop at "needs a person". Turn on only to film.' },
    { id: 'clean', label: 'Clean slate', ...yes(f.openCases === 0, 'No open cases', `${f.openCases} case${f.openCases === 1 ? '' : 's'} still open or unreleased: reset before filming`, 'warn') },
  ];
}

export const summarize = (checks: Check[]): { ready: boolean; fails: number; warns: number } => {
  const fails = checks.filter((c) => c.level === 'fail').length; const warns = checks.filter((c) => c.level === 'warn').length;
  return { ready: fails === 0, fails, warns };
};
