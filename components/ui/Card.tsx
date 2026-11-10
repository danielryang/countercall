import type { ReactNode } from 'react';

export function Card({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col border border-rule bg-surface-raised ${className}`}>
      {title && <header className="flex items-center justify-between border-b border-rule px-5 py-4"><h2 className="text-[15px] font-medium">{title}</h2>{aside ? <span className="cap">{aside}</span> : null}</header>}
      {children}
    </section>
  );
}
