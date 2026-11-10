// A soft surface: raised tone, one hairline, rounded. The only container the app uses.
import type { ReactNode } from 'react';

export function Card({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-xl border border-rule bg-surface-raised ${className}`}>
      {title && <header className="flex items-center justify-between px-5 pb-1 pt-4"><h2 className="text-[14px] font-medium">{title}</h2>{aside ? <span className="cap">{aside}</span> : null}</header>}
      {children}
    </section>
  );
}
