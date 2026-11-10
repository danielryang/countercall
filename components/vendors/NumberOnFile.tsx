// One number on file, with where it came from. Same language as the case file's call step: masked mono number, source and date, "not from an email".
// The primary is the only number CounterCall ever dials; a quarantined number is shown struck through so the viewer sees it was refused.
import { CONTACT_BADGE, provenanceText, verifiedText, ageText } from '@/lib/copy';
import type { VendorContact } from '@/lib/vendors';

const TONE = {
  ok: 'border-verified/50 text-verified',
  quiet: 'border-rule text-fg-muted',
  danger: 'border-blocked/50 text-blocked',
} as const;

export function NumberOnFile({ c }: { c: VendorContact }) {
  const badge = CONTACT_BADGE[c.isPrimary ? 'primary' : c.status];
  const refused = c.status !== 'trusted';
  return (
    <div className={`rounded-lg border border-rule px-3 py-2 ${c.isPrimary ? 'bg-surface' : ''}`}>
      <div className="flex items-center gap-3">
        <span className={`font-mono text-[14px] tabular-nums ${refused ? 'text-fg-muted line-through' : ''}`}>{c.phoneMasked}</span>
        <span className="min-w-0 truncate text-[13px] text-fg-muted" title={c.label}>{c.label}</span>
        <span className={`ml-auto shrink-0 rounded-md border px-1.5 py-px text-[11px] ${TONE[badge.tone]}`}>{badge.label}</span>
      </div>
      <p className="mt-1 text-[13px] leading-5" title={c.sourceDoc ?? undefined}>{provenanceText(c)}</p>
      {refused
        ? c.quarantineReason && <p className="cap mt-0.5">{c.quarantineReason}</p>
        : <p className="cap mt-0.5">{ageText(c.ageDays)} {'·'} {verifiedText(c)}</p>}
    </div>
  );
}
