export type Span = { id: string; start: number; end: number; kind: string; severity?: 0 | 1 };
export type Segment = { text: string; spans: Span[] }; // spans.length === 0 => plain text

/** Split `text` into non-overlapping segments; overlapping spans share a segment. Pure, no mutation. */
export function segment(text: string, spans: readonly Span[]): Segment[] {
  const valid = spans.filter((s) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end <= text.length && s.start < s.end);
  const cuts = [...new Set([0, text.length, ...valid.flatMap((s) => [s.start, s.end])])].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    out.push({ text: text.slice(a, b), spans: valid.filter((s) => s.start <= a && s.end >= b) });
  }
  return out;
}

/** Detector (LLM) gives quotes; offsets are resolved + verified server-side. Returns null if the quote is not in text. */
export function resolveQuote(text: string, quote: string, hint?: number): { start: number; end: number } | null {
  if (!quote) return null;
  if (hint !== undefined && text.startsWith(quote, hint)) return { start: hint, end: hint + quote.length };
  const i = text.indexOf(quote);
  return i < 0 ? null : { start: i, end: i + quote.length };
}
