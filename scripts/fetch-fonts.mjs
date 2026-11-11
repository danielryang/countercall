// scripts/fetch-fonts.mjs: downloads Switzer (ITF Free Font License, Fontshare) into public/fonts/switzer/ before `dev` and `build`.
// Why not commit the files: the license allows self-hosting on our own site but forbids redistributing the font through a public repository.
// So the repo carries only this script; each build fetches the official files from Fontshare and the deployed site serves its own copy.
// Idempotent (skips files already present) and never fails the build: without the font, the CSS stack falls back to the system sans.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'public/fonts/switzer';
const CSS = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';   // 1 = variable roman, 2 = variable italic
const OUT = { normal: 'Switzer-Variable.woff2', italic: 'Switzer-VariableItalic.woff2' };

async function main() {
  if (Object.values(OUT).every((f) => existsSync(`${DIR}/${f}`))) return;
  mkdirSync(DIR, { recursive: true });
  const css = await (await fetch(CSS)).text();
  for (const block of css.split('@font-face').slice(1)) {
    const style = /font-style:\s*(\w+)/.exec(block)?.[1];
    const url = /url\('([^']+\.woff2)'\)/.exec(block)?.[1];
    const name = style && OUT[style];
    if (!name || !url) continue;
    const res = await fetch(url.startsWith('//') ? `https:${url}` : url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${style}`);
    writeFileSync(`${DIR}/${name}`, Buffer.from(await res.arrayBuffer()));
    console.log(`fonts: ${DIR}/${name}`);
  }
}

main().catch((e) => console.warn(`fonts: Switzer not downloaded (${e.message}); the system sans will be used`));
