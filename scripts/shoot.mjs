// scripts/shoot.mjs (npm run shoot -- name=url ...): Playwright screenshots at the recording stage size, 1280x720 CSS px at DPR 2, into shots/ (gitignored).
//   npm run shoot -- queue="/cases?replay=fraud&at=16" case="/cases?replay=fraud&at=37"
// Read the PNGs. The taste loop is: shoot -> look -> fix by changing layout, scale or copy (never by adding decoration) -> shoot.
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const args = process.argv.slice(2).filter((a) => a.includes('='));
if (!args.length) { console.error('usage: npm run shoot -- name=/path?query ...'); process.exit(2); }
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
// Session-gated pages (/demo): SHOOT_AUTH=<name> signs in once with DEMO_PASSCODE from the environment (run with --env-file=.env.local) and keeps
// the cookie in shots/.auth.json (gitignored), so repeated shoots do not spend the 5-per-10-minute sign-in budget. The passcode is never printed.
const AUTH = 'shots/.auth.json';
if (process.env.SHOOT_AUTH && !existsSync(AUTH)) {
  const c = await browser.newContext();
  const r = await c.request.post(BASE + '/api/auth', { data: { passcode: process.env.DEMO_PASSCODE ?? '', name: process.env.SHOOT_AUTH }, headers: { origin: BASE } });
  if (!r.ok()) { console.error(`sign-in failed: HTTP ${r.status()}`); process.exit(1); }
  await c.storageState({ path: AUTH }); await c.close();
}
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, ...(process.env.SHOOT_AUTH ? { storageState: AUTH } : {}) });
const errors = [];
for (const a of args) {
  const i = a.indexOf('='); const name = a.slice(0, i); const url = a.slice(i + 1);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`)); page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  // Live pages poll /api/events forever, so 'networkidle' never comes; replay pages are idle quickly. Wait for idle up to 5 s, then go on.
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1400);   // let sweeps and stamps settle
  await page.screenshot({ path: `shots/${name}.png` });
  const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth, y: document.documentElement.scrollHeight > innerHeight }));
  console.log(`shots/${name}.png  overflow x:${overflow.x} y:${overflow.y}`);
  await page.close();
}
await browser.close();
if (errors.length) { console.error('console/page errors:\n' + errors.slice(0, 5).join('\n')); process.exit(1); }
