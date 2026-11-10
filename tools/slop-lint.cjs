// usage: node slop-lint.cjs <url> [outDir]
// Taste lint: screenshots at 3 widths + computed-style heuristics for the "AI-generated" tells. Exit code 1 if any FAIL.
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');

const BANNED = ['supercharge', 'seamless', 'unlock', 'revolutioni', 'elevate', 'empower', 'next-gen', 'cutting-edge', 'ai-powered', 'streamline', 'leverage', 'game-chang', 'effortless', 'in today', 'harness the power', 'take your', 'transform your', 'reimagine', 'delve', 'robust', 'all-in-one', 'ship faster', 'build faster'];
const SLOP_FONTS = ['inter', 'roboto', 'arial', 'helvetica', 'system-ui', '-apple-system', 'poppins', 'space grotesk', 'sf pro', 'segoe ui'];

(async () => {
  const [url, outDir = '/tmp/slop-lint'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = { url, checks: [] };
  const add = (id, status, detail) => results.checks.push({ id, status, detail });

  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/viewport-${w}.png` });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.screenshot({ path: `${outDir}/full-${w}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    add(`no-horizontal-overflow@${w}`, overflow <= 1 ? 'PASS' : 'FAIL', `scrollWidth-innerWidth=${overflow}`);
    if (w !== 1440) { await page.close(); continue; }

    const m = await page.evaluate(({ BANNED, SLOP_FONTS }) => {
      const out = {}; const els = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; });
      out.n = els.length;
      const hsl = (c) => { const m = c.match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?/); if (!m) return null; let [r, g, b] = [m[1], m[2], m[3]].map(x => +x / 255); const a = m[4] === undefined ? 1 : +m[4]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; const d = mx - mn; let hh = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + 360) % 360; } return { h: hh, s, l, a }; };
      // fonts by text-node share
      const fonts = {}; let textEls = 0;
      for (const e of els) { if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) { const f = getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase(); fonts[f] = (fonts[f] || 0) + 1; textEls++; } }
      out.fonts = fonts; out.textEls = textEls;
      out.slopFontShare = Object.entries(fonts).filter(([f]) => SLOP_FONTS.includes(f)).reduce((a, [, c]) => a + c, 0) / Math.max(textEls, 1);
      // radii / shadows / gradients / blur / transition-all
      let radius = 0, shadow = 0, backdrop = 0, transAll = 0, colorGrad = 0, dashed = 0, purple = 0; const purpleSamples = new Set();
      for (const e of els) {
        const s = getComputedStyle(e);
        const br = parseFloat(s.borderTopLeftRadius); if (br > 0 && !(e.getBoundingClientRect().width <= 14 && e.getBoundingClientRect().height <= 14)) radius++;
        if (s.boxShadow !== 'none' && !/inset/.test(s.boxShadow.slice(0, 5))) shadow++;
        if (s.backdropFilter !== 'none' && s.backdropFilter) backdrop++;
        if (/\ball\b/.test(s.transitionProperty) && parseFloat(s.transitionDuration) > 0) transAll++;
        if (s.borderTopStyle === 'dashed' || s.borderLeftStyle === 'dashed' || s.borderBottomStyle === 'dashed') dashed++;
        const bi = s.backgroundImage;
        if (/gradient/.test(bi)) { const cols = (bi.match(/rgba?\([^)]*\)/g) || []).filter(c => { const p = hsl(c); return p && p.a > 0.05; }); if (new Set(cols.map(c => c.replace(/\s/g, '').replace(/,[\d.]+\)$/, ')'))).size >= 2 && !/repeating/.test(bi)) colorGrad++; }
        for (const prop of ['color', 'backgroundColor', 'borderTopColor']) { const p = hsl(s[prop]); if (p && p.a > 0.3 && p.s > 0.25 && p.l > 0.2 && p.l < 0.85 && p.h >= 250 && p.h <= 295) { purple++; purpleSamples.add(s[prop]); } }
      }
      Object.assign(out, { radius, shadow, backdrop, transAll, colorGrad, dashed, purple, purpleSamples: [...purpleSamples].slice(0, 5) });
      out.radiusShare = radius / els.length;
      // icons
      const svgs = [...document.querySelectorAll('svg')].filter(s => s.getBoundingClientRect().width <= 28);
      out.lucide = document.querySelectorAll('svg[class*="lucide"]').length; out.smallSvgs = svgs.length;
      // three-card reflex
      let threeCards = 0;
      for (const c of document.querySelectorAll('div,ul,section')) { const k = [...c.children]; if (k.length === 3) { const ws = k.map(x => x.getBoundingClientRect().width); if (ws[0] > 150 && Math.max(...ws) - Math.min(...ws) < ws[0] * 0.03 && k.every(x => x.querySelector('svg,img') && x.querySelector('h2,h3,h4,strong') && x.querySelector('p'))) threeCards++; } }
      out.threeCards = threeCards;
      const h1 = document.querySelector('h1'); out.h1Center = h1 ? getComputedStyle(h1).textAlign === 'center' : null;
      const text = document.body.innerText.toLowerCase(); out.banned = BANNED.filter(b => text.includes(b));
      out.emoji = (document.body.innerText.match(/\p{Extended_Pictographic}/gu) || []).length;
      out.monoLabels = els.filter(e => { const s = getComputedStyle(e); return /mono|courier|menlo/i.test(s.fontFamily) && s.textTransform === 'uppercase' && parseFloat(s.fontSize) <= 13 && e.childElementCount === 0 && e.textContent.trim(); }).length;
      out.canvases = document.querySelectorAll('canvas').length;
      return out;
    }, { BANNED, SLOP_FONTS });

    add('no-slop-primary-font', m.slopFontShare < 0.1 ? 'PASS' : 'FAIL', `${(m.slopFontShare * 100).toFixed(0)}% of text elements in a slop font; fonts=${JSON.stringify(m.fonts)}`);
    add('radius<=3%-of-elements', m.radiusShare <= 0.03 ? 'PASS' : 'FAIL', `${m.radius} rounded elements (${(m.radiusShare * 100).toFixed(1)}%)`);
    add('no-box-shadows', m.shadow === 0 ? 'PASS' : 'FAIL', `${m.shadow} elements with outer box-shadow`);
    add('no-glassmorphism', m.backdrop === 0 ? 'PASS' : 'FAIL', `${m.backdrop} backdrop-filter`);
    add('no-colour-gradients', m.colorGrad === 0 ? 'PASS' : 'FAIL', `${m.colorGrad} multi-colour non-repeating gradients`);
    add('no-ai-purple', m.purple === 0 ? 'PASS' : 'FAIL', `${m.purple} uses of hue 250-295 deg; ${m.purpleSamples.join(' | ')}`);
    add('no-transition-all', m.transAll === 0 ? 'PASS' : 'WARN', `${m.transAll} elements transition all`);
    add('no-lucide', m.lucide === 0 ? 'PASS' : 'FAIL', `${m.lucide} lucide svgs`);
    add('small-svg-icons<=14', m.smallSvgs <= 14 ? 'PASS' : 'WARN', `${m.smallSvgs} svgs <=28px (logo walls and glyph grids are fine; icon-per-feature is not)`);
    add('no-three-icon-cards', m.threeCards === 0 ? 'PASS' : 'FAIL', `${m.threeCards} 3-equal-card rows with icon+heading+para`);
    add('h1-not-centered', m.h1Center === false ? 'PASS' : 'WARN', `h1 text-align center = ${m.h1Center}`);
    add('no-banned-phrases', m.banned.length === 0 ? 'PASS' : 'FAIL', m.banned.join(', ') || 'none');
    add('no-emoji', m.emoji === 0 ? 'PASS' : 'FAIL', `${m.emoji} emoji`);
    add('mono-micro-labels>=8', m.monoLabels >= 8 ? 'PASS' : 'WARN', `${m.monoLabels} uppercase mono labels (positive signal)`);
    add('dashed-hairlines>=6', m.dashed >= 6 ? 'PASS' : 'WARN', `${m.dashed} dashed-border elements (positive signal)`);
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(`${outDir}/lint.json`, JSON.stringify(results, null, 2));
  for (const c of results.checks) console.log(`${c.status.padEnd(4)} ${c.id.padEnd(28)} ${c.detail}`);
  const fails = results.checks.filter(c => c.status === 'FAIL').length;
  console.log(`\n${fails === 0 ? 'PASS' : 'FAIL'}: ${fails} fail, ${results.checks.filter(c => c.status === 'WARN').length} warn. Screenshots in ${outDir}`);
  process.exit(fails ? 1 : 0);
})();
