// Initials in a pastel circle, the way Ramp shows a vendor without a logo. The tint is picked from the name, so it is stable.
const TINTS = ['bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3'] as const;

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const words = name.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
  const tint = TINTS[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length];
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-[500] text-ink ${tint}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {initials}
    </span>
  );
}
