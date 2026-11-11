// The case banner, in the shape of Ramp's "Changes to this vendor are currently pending review" banner: a square tinted strip with a line icon and one
// plain sentence. It says what happened and what it means; the status is said once, here.
import { headline, type Tone } from '@/lib/copy';
import type { CaseView } from '@/lib/reducer';
import { clockRunning, elapsedAt, mmss } from '@/lib/selectors';

const TONE: Record<Tone, string> = {
  danger: 'bg-blocked-soft border-blocked-rule text-blocked',
  warn: 'bg-banner border-banner-rule text-banner-ink',
  ok: 'bg-verified-soft border-verified-rule text-approve',
  progress: 'bg-surface-raised border-rule-strong text-fg',
  neutral: 'bg-surface-raised border-rule-strong text-fg-muted',
};

function ToneIcon({ tone }: { tone: Tone }) {   // 20px line icons, 1.5 stroke
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0">
      {tone === 'danger' && <><circle cx="10" cy="10" r="7.5" /><path d="M5 15L15 5" /></>}
      {tone === 'warn' && <><path d="M10 2.8l7.6 13.4H2.4z" /><path d="M10 8v3.6M10 14v.1" /></>}
      {tone === 'ok' && <><circle cx="10" cy="10" r="7.5" /><path d="M6.6 10.2l2.3 2.3 4.6-4.8" /></>}
      {tone === 'progress' && <><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4l2.6 1.6" /></>}
      {tone === 'neutral' && <circle cx="10" cy="10" r="7.5" />}
    </svg>
  );
}

export function StatusBanner({ c, nowMs }: { c: CaseView; /** wall clock, live view only: the case clock ticks while the case is still working */ nowMs?: number }) {
  const h = headline(c);
  const done = !clockRunning(c);
  return (
    // state change: the banner's tone and sentence change with every case.state; it settles in when a result lands
    <div key={h.tone} className={`flex shrink-0 items-start gap-3 rounded-sm border px-5 py-3.5 ${TONE[h.tone]} ${done ? 'stamp' : ''}`}>
      <ToneIcon tone={h.tone} />
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-[550] leading-6">{h.title}</p>
        <p className="mt-0.5 text-[15px] leading-[22px] text-fg">{h.sub}</p>
      </div>
      {c.state !== 'calling' && <span className="shrink-0 pt-0.5 text-[14px] text-fg-muted">{done ? 'Result in ' : ''}<span className="font-mono text-fg">{mmss(elapsedAt(c, nowMs))}</span>{done ? '' : ' so far'}</span>}
    </div>
  );
}
