import type { NextConfig } from 'next';

const headers = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
];

// Never set `cacheComponents: true` here: it rejects `export const runtime` in the ported routes and turns every `new Date()` in a server page into a build error (09-spikes A1).
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,                // the dev badge would appear in every screenshot
  async headers() { return [{ source: '/:path*', headers }]; },
};
export default config;
