// The email, as TEXT ONLY (never the attacker's HTML, no images, URLs as text). Evidence highlights come from verified spans; header fields are highlighted from the
// signals that fired. Three treatments only: strong (who they claim to be / where the money goes), evidence (what they ask), quiet dashed (a number we will NOT dial).
import { segment, type Span as SegSpan } from '@/lib/spans';
import type { CaseView } from '@/lib/reducer';

const SENDER = new Set(['sender_domain_not_on_file', 'freemail_sender', 'display_name_impersonation', 'lookalike_domain', 'executive_impersonation']);
const REPLY = new Set(['reply_to_mismatch', 'reply_to_freemail']);
const kindOf = (label: string): 'strong' | 'quiet' | 'ev' => (/routing|account|iban|bank details/i.test(label) ? 'strong' : /phone number/i.test(label) ? 'quiet' : 'ev');
const RANK = { quiet: 0, ev: 1, strong: 2 } as const;

function Hdr({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[44px_1fr] gap-2 py-0.5 text-[13px] leading-5"><span className="cap">{k}</span><span className="min-w-0 break-words">{children}</span></div>;
}

export function EmailPane({ c }: { c: CaseView }) {
  if (!c.email) return <div className="cap p-6">Reading email<span className="scan-dots" /></div>;
  const ids = new Set(c.signals.map((s) => s.id));
  const [local, domain] = c.email.from.address.split('@');
  const senderHot = [...ids].some((i) => SENDER.has(i)); const replyHot = [...ids].some((i) => REPLY.has(i));
  const spans: SegSpan[] = c.spans.map((s, i) => ({ id: String(i), start: s.start, end: s.end, kind: s.label }));
  const segs = segment(c.email.body, spans);
  let n = 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-6 pb-3 pt-4">
        <Hdr k="From">{c.email.from.name ? `${c.email.from.name} ` : ''}<span className="text-fg-muted">{'<'}</span>{local}@<span className={senderHot ? 'ev-strong' : ''}>{domain}</span><span className="text-fg-muted">{'>'}</span></Hdr>
        {c.email.replyTo.length > 0 && <Hdr k="Reply">{c.email.replyTo.map((r) => <span key={r.address} className={replyHot ? 'ev-strong' : ''}>{r.address}</span>)}</Hdr>}
        <Hdr k="Subject"><b className="font-medium">{c.email.subject}</b></Hdr>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap border-t border-rule px-6 py-4 text-[15px] leading-[1.6]">
        {segs.map((sg, i) => {
          if (!sg.spans.length) return <span key={i}>{sg.text}</span>;
          const kind = sg.spans.map((s) => kindOf(s.kind)).sort((a, b) => RANK[b] - RANK[a])[0];
          if (kind === 'quiet') return <span key={i} className="ev-quiet" data-struck={!!c.call}>{sg.text}</span>;
          return <span key={i} className={kind === 'strong' ? 'ev-strong' : 'ev'} style={{ ['--sweep-delay' as string]: `${200 + n++ * 170}ms` }} title={sg.spans.map((s) => s.kind).join(' · ')}>{sg.text}</span>;
        })}
      </div>
    </div>
  );
}
