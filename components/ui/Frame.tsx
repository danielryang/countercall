// A panel: one solid hairline, tone-on-tone surface. No corner furniture, no radius or elevation (the theme has none). Optional quiet caption.
import type { ReactNode } from 'react';

export function Frame({ label, aside, children, className = '' }: { label?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`relative border border-rule ${className}`}>
      {label && (
        <header className="cap flex items-center justify-between px-3 py-2">
          <span>{label}</span>{aside ? <span>{aside}</span> : null}
        </header>
      )}
      {children}
    </section>
  );
}
