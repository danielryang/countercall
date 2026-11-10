// video/src/facts.ts: every number the technical scenes show, each with the command that printed it. docs/video/script.md cites the
// same commands. Re-run them before the script lock and update this file; never type a number into a scene directly.
export const FACTS = {
  verifier: {
    source: 'npm run verify:policy',
    total: 20_995_238,
    unsafe: 0,
    violations: 0,
    rows: [
      { fn: 'decideOutcome', cases: 20_991_600 },
      { fn: 'nextState', cases: 3_318 },
      { fn: 'canRelease', cases: 320 },
    ],
  },
  sim: {
    source: 'npm run sim -- --seeds 200',
    seeds: 200,
    calls: 400,
    deliveries: 3_087,
    forged: 825,
    reaped: 30,
    line: 'all invariants held on every seed',
    bugs: 2, // README §6: the reaper gap and the lpad case-id collision, both found by the simulator and fixed
  },
  evalLive: {
    source: 'npm run eval:live',
    date: '2026-11-10',
    model: 'claude-haiku-5-5',
    n: 20,
    pass: 20,
    recall: [12, 12],
    falsePositives: [0, 4],
    p50s: 1.8,
    maxs: 2.7,
  },
  evalRulesOnly: {
    source: 'npm run eval -- --det-only',
    pass: 16,
    n: 20,
    recall: [12, 12],
    benignToHuman: 4,
  },
  audit: {
    source: 'npm run audit:verify',
    date: '2026-11-10',
    where: 'production',
    intact: true,
    beforeSeal: 131,
    rebuilt: [11, 11],
  },
} as const;

export const fmt = (n: number) => n.toLocaleString('en-US');
