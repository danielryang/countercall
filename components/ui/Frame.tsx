// A dashed hairline panel with + registration ticks at the corners and an optional mono caption. Flat by construction: the theme has no radius or elevation tokens.
import type { ReactNode } from 'react';

export function Frame({ label, aside, children, className = '', ticks = true }: { label?: string; aside?: ReactNode; children: ReactNode; className?: string; ticks?: boolean }) {
  return (
    <section className={`relative border border-dashed border-rule ${className}`}>
      {ticks && (<><i className="tick -left-[5px] -top-[5px]" /><i className="tick -right-[5px] -top-[5px]" /><i className="tick -bottom-[5px] -left-[5px]" /><i className="tick -bottom-[5px] -right-[5px]" /></>)}
      {label && (
        <header className="label flex items-center justify-between border-b border-dashed border-rule px-3 py-1.5 text-fg-muted">
          <span>{label}</span>{aside ? <span>{aside}</span> : null}
        </header>
      )}
      {children}
    </section>
  );
}
