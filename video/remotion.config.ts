// video/remotion.config.ts: the config 09 rendered (08 §7.5 S11). Run every remotion command from video/.
import path from 'node:path';
import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(16);
Config.setColorSpace('bt709'); // the default tags yuvj420p/bt470bg; also pass --color-space=bt709 on the command line
// '@' matches the app's tsconfig paths ("@/*" -> repo root). process.cwd(), NOT __dirname (it points at the CLI). No React alias.
Config.overrideWebpackConfig((c) =>
  enableTailwind({
    ...c,
    // roots: the app's CSS loads fonts by site-root URLs (/fonts/...), which the website serves from public/. Resolve them from the same folder.
    resolve: { ...c.resolve, roots: [path.resolve(process.cwd(), '..', 'public')], alias: { ...(c.resolve?.alias ?? {}), '@': path.resolve(process.cwd(), '..') } },
  }),
);
