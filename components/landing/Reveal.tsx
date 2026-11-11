'use client';
// Scroll reveal for the landing page. State change it communicates: "this part of the story just arrived" as the reader scrolls to it.
// The wrapper's direct children rise in one after another (globals.css [data-reveal]). Safe by default: the server renders everything visible; only a block
// that starts BELOW the fold is hidden after mount and revealed when it scrolls in. No JS, a block already on screen, or reduced motion: shown at once.
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Phase = 'shown' | 'waiting' | 'in';

export function Reveal({ as: Tag = 'div', className = '', children }: { as?: 'div' | 'ul' | 'ol'; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>('shown');
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;   // already on screen at load: leave it alone, no flash
    setPhase('waiting');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPhase('in'); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as never} className={className} data-reveal={phase === 'shown' ? undefined : phase}>{children}</Tag>;
}
