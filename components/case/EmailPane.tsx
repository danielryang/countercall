// The email, as TEXT ONLY (never the attacker's HTML, no images, URLs as text). Highlights are drawn from verified spans and explained by a one-line legend.
import { segment, type Span as SegSpan } from '@/lib/spans';
import type { CaseView } from '@/lib/reducer';

const SENDER = new Set(['sender_domain_not_on_file', 'freemail_sender', 'display_name_impersonation', 'lookalike_domain', 'executive_impersonation']);
const REPLY = new Set(['reply_to_mismatch', 'reply_to_freemail']);
const kindOf = (label: string): 'strong' | 'quiet' | 'ev' => (/routing|account|iban|bank details/i.test(label) ? 'strong' : /phone number/i.test(label) ? 'quiet' : 'ev');
const RANK = { quiet: 0, ev: 1, strong: 2 } as const;

type Merged = { text: string; kind: 'strong' | 'quiet' | 'ev' | null; labels: string[] };
/** Adjacent segments with the same highlight treatment become ONE marker (otherwise "banks" and "." render as two separate pills). */
function merge(segs: ReturnType<typeof segment>): Merged[] {
  const out: Merged[] = [];
  for (const sg of segs) {
    const kind = sg.spans.length ? sg.spans.map((x) => kindOf(x.kind)).sort((a, b) => RANK[b] - RANK[a])[0] : null;
    const last = out.at(-1);
    if (last && last.kind === kind) { last.text += sg.text; last.labels.push(...sg.spans.map((x) => x.kind)); } else out.push({ text: sg.text, kind, labels: sg.spans.map((x) => x.kind) });
  }
  return out;
}

function Hdr({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2 py-0.5 text-[13px] leading-5"><span className="cap">{k}</span><span className="min-w-0 break-words">{children}</span></div>;
}

export function EmailPane({ c }: { c: CaseView }) {
  if (!c.email) return <div className="cap p-5">Reading the email<span className="scan-dots" /></div>;
  const ids = new Set(c.signals.map((s) => s.id));
  const [local, domain] = c.email.from.address.split('@');
  const senderHot = [...ids].some((i) => SENDER.has(i)); const replyHot = [...ids].some((i) => REPLY.has(i));
  const MAX_MODEL_QUOTE = 40;   // live model quotes can be whole sentences; only short ones read as evidence. Rule spans (exact matches) always show.
  const spans: SegSpan[] = c.spans.filter((s) => s.source === 'rule' || s.end - s.start <= MAX_MODEL_QUOTE).map((s, i) => ({ id: String(i), start: s.start, end: s.end, kind: s.label }));
  const segs = segment(c.email.body, spans);
  const flagged = c.spans.length > 0 || senderHot;
  let n = 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pb-3 pt-2">
        <Hdr k="From">{c.email.from.name ? `${c.email.from.name} ` : ''}<span className="text-fg-muted">{'<'}</span>{local}@<span className={senderHot ? 'ev-strong' : ''}>{domain}</span><span className="text-fg-muted">{'>'}</span></Hdr>
        {c.email.replyTo.length > 0 && <Hdr k="Reply to">{c.email.replyTo.map((r) => <span key={r.address} className={replyHot ? 'ev-strong' : ''}>{r.address}</span>)}</Hdr>}
        <Hdr k="Subject"><b className="font-medium">{c.email.subject}</b></Hdr>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap border-t border-rule px-5 py-4 text-[15px] leading-[1.6]">
        {merge(segs).map((sg, i) => {
          if (sg.kind === null) return <span key={i}>{sg.text}</span>;
          if (sg.kind === 'quiet') return <span key={i} className="ev-quiet" data-struck={!!c.call}>{sg.text}</span>;
          return <span key={i} className={sg.kind === 'strong' ? 'ev-strong' : 'ev'} style={{ ['--sweep-delay' as string]: `${200 + n++ * 170}ms` }} title={sg.labels.join(' \u00b7 ')}>{sg.text}</span>;
        })}
      </div>
      {flagged && (
        <div className="flex items-center gap-2 border-t border-rule px-5 py-2.5 text-[12px] text-fg-muted">
          <i className="ev inline-block h-3 w-5" aria-hidden />Highlighted: what looks suspicious
        </div>
      )}
    </div>
  );
}
