'use client';
import { useEffect, useRef, useState } from 'react';
const KEY = 'cc-present';
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
export function usePresentMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('present'); let stored: string | null = null; try { stored = localStorage.getItem(KEY); } catch {} setOn(q === '1' ? true : q === '0' ? false : stored === '1'); }, []);
  useEffect(() => { const root = document.documentElement; if (on) root.setAttribute('data-present', ''); else root.removeAttribute('data-present'); try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {} }, [on]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return; if (e.key === 'p' || e.key === 'P') setOn((x) => !x); else if (e.key === 'Escape') setOn(false); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  return [on, setOn];
}
function CursorRing() { const ref = useRef<HTMLDivElement>(null); useEffect(() => { const el = ref.current; if (!el) return; const move = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; el.dataset.shown = ''; }; const hide = () => { delete el.dataset.shown; }; const down = () => { el.dataset.down = ''; }; const up = () => { delete el.dataset.down; }; window.addEventListener('pointermove', move); window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); document.documentElement.addEventListener('pointerleave', hide); return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); document.documentElement.removeEventListener('pointerleave', hide); }; }, []); return <div ref={ref} aria-hidden className="cursor-ring" />; }
export function PresentMode({ theme: _theme }: { theme: string }) { const [on] = usePresentMode(); return on ? <CursorRing /> : null; }
