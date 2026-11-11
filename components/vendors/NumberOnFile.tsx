// One number on file, as a row in a Ramp list: the masked number, its label, a status pill, then where it came from. The primary is the only number
// CounterCall ever dials; a quarantined number is struck through so the viewer sees it was refused.
import { CONTACT_BADGE, provenanceText, verifiedText, ageText } from '@/lib/copy';
import type { VendorContact } from '@/lib/vendors';

const PILL = {
  ok: 'bg-verified-soft text-verified',
  quiet: 'bg-surface-raised text-fg-muted',
  danger: 'bg-blocked-soft text-blocked',
} as const;

export function NumberOnFile({ c }: { c: VendorContact }) {
  const badge = CONTACT_BADGE[c.isPrimary ? 'primary' : c.status];
  const refused = c.status !== 'trusted';
  return (
    <div className="border-b border-rule py-3.5">
      <div className="flex items-center gap-3">
        <span className={`font-mono text-[17px] ${refused ? 'text-fg-muted line-through' : ''}`}>{c.phoneMasked}</span>
        <span className="min-w-0 truncate text-[15px] text-fg-muted" title={c.label}>{c.label}</span>
        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-[500] ${PILL[badge.tone]}`}>{badge.label}</span>
      </div>
      <p className="mt-1 text-[15px] leading-[22px]" title={c.sourceDoc ?? undefined}>{provenanceText(c)}</p>
      {refused
        ? c.quarantineReason && <p className="text-[14px] leading-5 text-fg-muted">{c.quarantineReason}</p>
        : <p className="text-[14px] leading-5 text-fg-muted">{ageText(c.ageDays)} {'·'} {verifiedText(c)}</p>}
    </div>
  );
}
