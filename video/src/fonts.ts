// video/src/fonts.ts: the app's two fonts (both SIL OFL 1.1), self-hosted from @fontsource so a render needs no Google Fonts request.
// Same families and weights as app/layout.tsx. The render waits until every face is loaded, so frame 0 never shows a fallback font.
import '@fontsource-variable/mona-sans/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import { continueRender, delayRender } from 'remotion';

const FACES = [
  '400 32px "Mona Sans Variable"', '600 32px "Mona Sans Variable"', '800 32px "Mona Sans Variable"',
  '400 32px "IBM Plex Mono"', '500 32px "IBM Plex Mono"', '600 32px "IBM Plex Mono"',
];

const handle = delayRender('fonts');
Promise.all(FACES.map((f) => document.fonts.load(f)))
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle)); // a missing face falls back to the token stack; never hang the render
