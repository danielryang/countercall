// The trust anchor, with provenance: the number came from a signed document, not from the email.
import { SOURCE_LABEL as SOURCE } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';

export function TrustedNumberCard({ c }: { c: CaseView }) {
  const ct = c.call?.contact;
  const masked = ct?.phoneMasked ?? c.trusted?.phoneMasked;
  if (!masked) return <div className="cap px-4 py-2">No trusted number resolved yet</div>;
  const fromEmail = c.signals.find((s) => s.id === 'phone_in_email');
  return (
    <div className="px-4 pb-2 text-[13px] leading-5">
      <div className="flex items-baseline justify-between"><span className="font-mono text-[15px] tabular-nums">{masked}</span><span className="cap">{'✓'} on file</span></div>
      {ct && <div className="cap">{SOURCE[ct.source] ?? ct.source} {'·'} added {ct.firstSeenAt.slice(0, 10)} by {ct.addedBy} {'·'} not from this email</div>}
      {fromEmail && <div className="cap mt-1"><span className="text-blocked">{'✕'} never dialed</span> {'·'} {fromEmail.detail}</div>}
    </div>
  );
}
