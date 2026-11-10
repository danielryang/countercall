// The log check as a chip: glyph + text, never colour alone. Presentational: the caller passes the kind (lib/audit-view.ts badgeState) and,
// when the seal is on, the latest seal. `compact` is the quiet footer form (a glyph and a word, no tint).
import { AUDIT } from '@/lib/copy';
import type { BadgeKind } from '@/lib/audit-view';

export type AuditBadgeKind = BadgeKind | 'replay';
const RISK: Partial<Record<AuditBadgeKind, 'VERIFIED' | 'BLOCKED' | 'NEEDS_REVIEW'>> = { intact: 'VERIFIED', broken: 'BLOCKED', replay_mismatch: 'NEEDS_REVIEW' };
const GLYPH: Record<AuditBadgeKind, string> = { intact: '✓', broken: '✕', replay_mismatch: '▲', not_installed: '○', unavailable: '–', replay: '▷' };

export function AuditBadge({ kind, seal, compact = false }: { kind: AuditBadgeKind; seal?: string | null; compact?: boolean }) {
  const label = AUDIT.badge[kind];
  if (compact) {
    const tone = kind === 'broken' ? 'text-blocked' : kind === 'replay_mismatch' ? 'text-review' : '';
    return (
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className={`font-mono text-[11px] ${tone}`}>{GLYPH[kind]}</span>
        <span>{label}</span>
      </span>
    );
  }
  const risk = RISK[kind];
  return (
    <span className="inline-flex items-center gap-2.5">
      {risk
        ? <span className="chip" data-status={risk}>{label}</span>
        : <span className="chip-plain" data-variant={kind === 'not_installed' ? 'dashed' : 'quiet'}><span aria-hidden className="font-mono text-[11px]">{GLYPH[kind]}</span>{label}</span>}
      {seal ? <span className="text-[12px] text-fg-muted">{AUDIT.latestSeal} <span className="font-mono text-fg">{seal.slice(0, 12)}</span></span> : null}
    </span>
  );
}
