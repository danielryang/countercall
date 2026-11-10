// scripts/shoot.mjs (npm run shoot -- name=url ...): Playwright screenshots at the recording stage size, 1280x720 CSS px at DPR 2, into shots/ (gitignored).
//   npm run shoot -- queue="/cases?replay=fraud&at=16" case="/cases?replay=fraud&at=37"
// Read the PNGs. The taste loop is: shoot -> look -> fix by changing layout, scale or copy (never by adding decoration) -> shoot.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const args = process.argv.slice(2).filter((a) => a.includes('='));
if (!args.length) { console.error('usage: npm run shoot -- name=/path?query ...'); process.exit(2); }
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const errors = [];
for (const a of args) {
  const i = a.indexOf('='); const name = a.slice(0, i); const url = a.slice(i + 1);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`)); page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);   // let sweeps and stamps settle
  await page.screenshot({ path: `shots/${name}.png` });
  const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth, y: document.documentElement.scrollHeight > innerHeight }));
  console.log(`shots/${name}.png  overflow x:${overflow.x} y:${overflow.y}`);
  await page.close();
}
await browser.close();
if (errors.length) { console.error('console/page errors:\n' + errors.slice(0, 5).join('\n')); process.exit(1); }
