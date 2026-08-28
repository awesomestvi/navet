import { cp, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { assetPaths, appPaths, repoRoot } from './repo-paths.mjs';

await build({ configFile: `${repoRoot}/apps/ha-panel/vite.config.ts` });

await mkdir(`${appPaths.haPanelDist}/wallpapers`, { recursive: true });
await cp(`${assetPaths.public}/logo.svg`, `${appPaths.haPanelDist}/logo.svg`);
await cp(`${assetPaths.public}/wallpapers`, `${appPaths.haPanelDist}/wallpapers`, {
  recursive: true,
});
