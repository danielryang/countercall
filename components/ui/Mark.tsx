// CounterCall's mark: a dark rounded tile with a short lime bar (money held in place). Original to CounterCall; never Ramp's logo.
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden>
      <rect width="22" height="22" rx="6" fill="var(--color-black)" />
      <rect x="5" y="9.5" width="12" height="3" rx="1.5" fill="var(--color-solar)" />
    </svg>
  );
}
