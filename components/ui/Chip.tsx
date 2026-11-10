// Status chip. Risk states: solid cut-corner chip with glyph (never colour alone). Neutral states: hairline. Copy and mapping live in lib/copy.ts.
import type { CaseState } from '@/lib/events';
import { CHIP } from '@/lib/copy';

export function Chip({ state }: { state: CaseState }) {
  const c = CHIP[state];
  if (c.kind === 'risk') return <span className="chip" data-status={c.status}>{c.label}</span>;
  return <span className="chip-plain" data-variant={c.variant}>{c.label}{state === 'scanning' ? <span className="scan-dots" aria-hidden /> : null}</span>;
}
