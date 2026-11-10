'use client';
// Present mode: P toggles it (never while typing), Esc leaves it, ?present=1 / ?present=0 force it. It hides dev affordances, scales the whole
// screen to 115%, suppresses toasts and draws a ring around the cursor so a room can follow the pointer. The styling lives in globals.css under
// html[data-present]; this file only flips that attribute and moves the ring. Presentational: no next/*, no data.
import { useEffect, useRef, useState } from 'react';

const KEY = 'cc-present';
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function usePresentMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {   // ?present= wins, then the last choice
    const q = new URLSearchParams(window.location.search).get('present'); let stored: string | null = null;
    try { stored = localStorage.getItem(KEY); } catch { /* storage can be blocked; off is fine */ }
    setOn(q === '1' ? true : q === '0' ? false : stored === '1');
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    if (on) el.setAttribute('data-present', ''); else el.removeAttribute('data-present');
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ }
  }, [on]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (e.key === 'p' || e.key === 'P') setOn((x) => !x);
      else if (e.key === 'Escape' && !e.defaultPrevented) setOn(false);   // a dialog that handles Esc itself keeps present mode on
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); document.documentElement.removeAttribute('data-present'); };
  }, []);
  return [on, setOn];
}

/** The ring that follows a mouse pointer. Communicates "here is where the presenter is pointing"; a press fills it briefly.
 *  Movement is a transform (no layout); under prefers-reduced-motion it jumps instead of gliding (globals.css). */
function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const move = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; el.dataset.shown = ''; };
    const hide = () => { delete el.dataset.shown; };
    const down = () => { el.dataset.down = ''; }; const up = () => { delete el.dataset.down; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', hide);
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', hide);
    };
  }, []);
  return <div ref={ref} aria-hidden className="cursor-ring" />;
}

/** Mount once per page, outside the scaled frame so the ring tracks real pointer coordinates. `theme` keeps the ring on the page's tokens. */
export function PresentMode({ theme }: { theme: string }) {
  const [on] = usePresentMode();
  if (!on) return null;
  return <div data-theme={theme} className="contents"><CursorRing /></div>;
}
