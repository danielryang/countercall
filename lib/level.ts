/** G.711 mu-law byte -> 16-bit linear PCM */
export const ulaw = (b: number): number => { b = ~b & 0xff; const e = (b >> 4) & 7, v = (((b & 0xf) << 3) + 0x84) << e; return (b & 0x80 ? 0x84 - v : v - 0x84); };
/** RMS level 0..1 of a base64 Twilio media payload (8 kHz mu-law, 20 ms = 160 bytes) */
export function rmsLevel(b64: string): number {
  const buf = Buffer.from(b64, 'base64'); if (!buf.length) return 0;
  let sum = 0; for (const b of buf) { const x = ulaw(b); sum += x * x; }
  return Math.min(1, Math.sqrt(sum / buf.length) / 32124 * 4); // 32124 = max |sample|; *4 = visual gain (speech RMS is ~10-25% of full scale), tune by eye
}
/** Reveal pacer: how many chars of an agent turn to show after `elapsedMs`, so text does not outrun the audio */
export const CPS = 15;
export const revealed = (full: string, elapsedMs: number, final: boolean, cps = CPS) => final && elapsedMs > (full.length / cps) * 1000 + 300 ? full.length : Math.min(full.length, Math.floor((elapsedMs / 1000) * cps));
