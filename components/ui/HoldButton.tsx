'use client';
// Press-and-hold to confirm. A release is irreversible, so one click is not enough: the fill takes HOLD_MS and letting go early cancels it.
// Works with pointer and keyboard (hold Space or Enter). The action fires once, on completion; nothing is optimistic.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export const HOLD_MS = 800;

export function HoldButton({ children, onConfirm, disabled, busy }: { children: ReactNode; onConfirm: () => void; disabled?: boolean; busy?: boolean }) {
  const [p, setP] = useState(0);
  const raf = useRef<number | null>(null); const t0 = useRef(0); const fired = useRef(false);
  const confirm = useRef(onConfirm); confirm.current = onConfirm;
  const stop = () => { if (raf.current !== null) cancelAnimationFrame(raf.current); raf.current = null; fired.current = false; setP(0); };
  const tick = (now: number) => {
    const pct = Math.min(1, (now - t0.current) / HOLD_MS);
    setP(pct);
    if (pct >= 1) { raf.current = null; if (!fired.current) { fired.current = true; confirm.current(); } return; }
    raf.current = requestAnimationFrame(tick);
  };
  const begin = () => { if (disabled || busy || raf.current !== null || fired.current) return; t0.current = performance.now(); raf.current = requestAnimationFrame(tick); };
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);
  const off = disabled || busy;
  return (
    <button type="button" disabled={off} aria-busy={busy}
      onPointerDown={begin} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onBlur={stop}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') stop(); }}
      className="relative select-none overflow-hidden rounded-lg border border-fg px-4 py-2 text-[14px] font-medium disabled:border-rule disabled:text-fg-muted">
      <i aria-hidden className="absolute inset-y-0 left-0 bg-fg/20" style={{ width: `${p * 100}%` }} />
      <span className="relative">{busy ? 'Releasing\u2026' : children}</span>
    </button>
  );
}
