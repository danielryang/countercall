// The trust anchor, with provenance. Ramp keeps a phone with no history; this card shows WHERE the number came from and that it did not come from the email.
import type { CaseView } from '@/lib/reducer';

import { SOURCE_LABEL as SOURCE } from '@/lib/copy';
const ymd = (iso: string) => iso.slice(0, 10);

export function TrustedNumberCard({ c }: { c: CaseView }) {
  const ct = c.call?.contact;
  const masked = ct?.phoneMasked ?? c.trusted?.phoneMasked;
  if (!masked) return <div className="label px-3 py-2 text-fg-muted">No trusted number resolved yet</div>;
  const fromEmail = c.signals.find((s) => s.id === 'phone_in_email');
  return (
    <div className="px-3 py-2 text-[13px] leading-5">
      <div className="flex items-baseline justify-between"><span className="font-mono text-[15px] font-semibold tabular-nums">{masked}</span><span className="label">{'✓'} On file</span></div>
      {ct && (
        <dl className="mt-1 grid grid-cols-[84px_1fr] gap-x-2 text-fg-muted">
          <dt className="label">Source</dt><dd>{SOURCE[ct.source] ?? ct.source} · added {ymd(ct.firstSeenAt)} · {ct.addedBy}</dd>
          {ct.sourceDoc && <><dt className="label">Document</dt><dd>{ct.sourceDoc}</dd></>}
          <dt className="label">Provenance</dt><dd className="font-semibold text-fg">Not from this email</dd>
        </dl>
      )}
      {fromEmail && <div className="mt-1 flex items-baseline gap-2 text-fg-muted"><span className="label text-blocked">{'✕'} Never dialed</span><span className="truncate">{fromEmail.detail}</span></div>}
    </div>
  );
}
