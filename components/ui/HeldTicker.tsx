'use client';
// The frozen-money total in the top bar. Digits roll (NumberFlow) only when the value itself changes, and the value only changes when events change
// heldCents(): a payment.held adds bills, a payment.released removes them. Never optimistic. NumberFlow honours prefers-reduced-motion by default
// (respectMotionPreference), so reduced-motion viewers see the new amount at once.
import NumberFlow from '@number-flow/react';

const FORMAT = { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

export function HeldTicker({ cents }: { cents: number }) {
  return (
    <span className="font-mono text-[18px] font-medium tabular-nums" style={cents ? { color: 'color-mix(in oklab, var(--color-held) var(--chip-mix), var(--fg))' } : undefined}>
      {/* state change: the total frozen across all open cases went up (hold) or down (human release) */}
      <NumberFlow value={cents / 100} format={FORMAT} locales="en-US" respectMotionPreference />
    </span>
  );
}
