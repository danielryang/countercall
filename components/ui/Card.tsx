// A Ramp-style card: white, one hairline border, near-square, flat. Title in the header, optional quiet aside. Never nest one card inside another.
import type { ReactNode } from 'react';

export function Card({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-xl border border-rule bg-surface ${className}`}>
      {title && <header className="flex items-baseline justify-between gap-4 px-5 pb-1 pt-4"><h2 className="text-[16px] font-[550]">{title}</h2>{aside ? <span className="cap">{aside}</span> : null}</header>}
      {children}
    </section>
  );
}
