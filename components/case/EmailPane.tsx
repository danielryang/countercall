// The email, as TEXT ONLY (never the attacker's HTML, no images, URLs as text). Highlights are drawn from verified spans and explained by a one-line legend.
// Evidence links: each highlight knows which detector signals point at it. Hovering or focusing one reports those signal ids up (`onHot`); the case detail
// owns that state and passes back `hot`, so the matching reason row and every highlight of the same signal light up together.
import { segment, type Span as SegSpan } from '@/lib/spans';
import { evidenceMap, overlaps, signalsForSpan, visibleSpan } from '@/lib/evidence';
import type { CaseView } from '@/lib/reducer';

const kindOf = (label: string): 'strong' | 'quiet' | 'ev' => (/routing|account|iban|bank details/i.test(label) ? 'strong' : /phone number/i.test(label) ? 'quiet' : 'ev');
const RANK = { quiet: 0, ev: 1, strong: 2 } as const;

type Merged = { text: string; kind: 'strong' | 'quiet' | 'ev' | null; labels: string[]; ids: string[] };
/** Adjacent segments with the same highlight treatment AND the same linked signals become ONE marker (otherwise "banks" and "." render as two pills). */
function merge(segs: ReturnType<typeof segment>, idsOf: (s: SegSpan) => string[]): Merged[] {
  const out: Merged[] = [];
  for (const sg of segs) {
    const kind = sg.spans.length ? sg.spans.map((x) => kindOf(x.kind)).sort((a, b) => RANK[b] - RANK[a])[0] : null;
    const ids = [...new Set(sg.spans.flatMap(idsOf))].sort();
    const last = out.at(-1);
    if (last && last.kind === kind && last.ids.join() === ids.join()) { last.text += sg.text; last.labels.push(...sg.spans.map((x) => x.kind)); }
    else out.push({ text: sg.text, kind, labels: sg.spans.map((x) => x.kind), ids });
  }
  return out;
}

function Hdr({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2 py-0.5 text-[13px] leading-5"><span className="cap">{k}</span><span className="min-w-0 break-words">{children}</span></div>;
}

type Link = { hot?: string[] | null; onHot?: (ids: string[] | null) => void };
/** Props that make a highlight a hover/focus target linked to its signals. Highlights without a signal behind them stay plain text. */
const linkProps = (ids: string[], { hot, onHot }: Link) => !ids.length || !onHot ? {} : {
  tabIndex: 0, 'data-hot': overlaps(ids, hot ?? null) || undefined,
  onMouseEnter: () => onHot(ids), onMouseLeave: () => onHot(null), onFocus: () => onHot(ids), onBlur: () => onHot(null),
};

export function EmailPane({ c, hot, onHot }: { c: CaseView } & Link) {
  if (!c.email) return <div className="cap rounded-xl border border-rule p-5">Reading the email<span className="scan-dots" /></div>;
  const ev = evidenceMap(c);
  const [local, domain] = c.email.from.address.split('@');
  const senderHot = ev.from.length > 0; const replyHot = ev.replyTo.length > 0;
  const len = c.email.body.length;
  const spans: SegSpan[] = c.spans.filter((s) => s.source === 'rule' || visibleSpan(s, len)).map((s, i) => ({ id: String(i), start: s.start, end: s.end, kind: s.label }));
  const segs = segment(c.email.body, spans);
  const flagged = c.spans.length > 0 || senderHot;
  const link = { hot, onHot };
  let n = 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-rule bg-surface">
      <div className="px-5 pb-3 pt-3">
        <Hdr k="From">{c.email.from.name ? `${c.email.from.name} ` : ''}<span className="text-fg-muted">{'<'}</span>{local}@<span className={senderHot ? 'ev-strong' : ''} {...linkProps(ev.from, link)}>{domain}</span><span className="text-fg-muted">{'>'}</span></Hdr>
        {c.email.replyTo.length > 0 && <Hdr k="Reply to">{c.email.replyTo.map((r) => <span key={r.address} className={replyHot ? 'ev-strong' : ''} {...linkProps(ev.replyTo, link)}>{r.address}</span>)}</Hdr>}
        <Hdr k="Subject"><b className="font-medium">{c.email.subject}</b></Hdr>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap border-t border-rule px-5 py-4 text-[15.5px] leading-[1.6]">
        {merge(segs, (s) => signalsForSpan(c, s.start, s.end)).map((sg, i) => {
          if (sg.kind === null) return <span key={i}>{sg.text}</span>;
          if (sg.kind === 'quiet') return <span key={i} className="ev-quiet" data-struck={!!c.call} {...linkProps(sg.ids, link)}>{sg.text}</span>;
          return <span key={i} className={sg.kind === 'strong' ? 'ev-strong' : 'ev'} style={{ ['--sweep-delay' as string]: `${200 + n++ * 170}ms` }} title={sg.labels.join(' · ')} {...linkProps(sg.ids, link)}>{sg.text}</span>;
        })}
      </div>
      {flagged && (
        <div className="flex items-center gap-2 border-t border-rule px-5 py-2.5 text-[12px] text-fg-muted">
          <i className="inline-block h-3.5 w-5 rounded-sm bg-solar" aria-hidden />Highlighted: what looks suspicious
        </div>
      )}
    </div>
  );
}
