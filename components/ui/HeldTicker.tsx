'use client';
// The frozen-money total. Digits roll (NumberFlow) only when the value itself changes, and the value only changes when events change heldCents():
// a payment.held adds bills, a payment.released removes them. Never optimistic. NumberFlow honours prefers-reduced-motion by default.
// While anything is held, the amount sits on the Blaze tint; at zero it is plain ink.
import NumberFlow from '@number-flow/react';

const FORMAT = { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

export function HeldTicker({ cents, size = 18, plain = false }: { cents: number; size?: number; /** no tint: the caller colours it */ plain?: boolean }) {
  return (
    <span className={`inline-flex items-center font-mono tabular-nums ${plain ? '' : `px-2 font-medium ${cents ? 'slab' : ''}`}`} style={{ fontSize: size, lineHeight: 1.35 }}>
      {/* state change: the total frozen across all open cases went up (hold) or down (human release) */}
      <NumberFlow value={cents / 100} format={FORMAT} locales="en-US" respectMotionPreference />
    </span>
  );
}
