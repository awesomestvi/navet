import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'vite';
import { assetPaths, homeAssistantPaths, appPaths, repoRoot } from './repo-paths.mjs';

await build({ configFile: `${repoRoot}/apps/ha-panel/vite.config.ts` });

await rm(homeAssistantPaths.navetFrontend, { recursive: true, force: true });
await cp(appPaths.haPanelDist, homeAssistantPaths.navetFrontend, { recursive: true });
await mkdir(`${homeAssistantPaths.navetFrontend}/wallpapers`, { recursive: true });
await cp(`${assetPaths.public}/logo.svg`, `${homeAssistantPaths.navetFrontend}/logo.svg`);
await cp(`${assetPaths.public}/wallpapers`, `${homeAssistantPaths.navetFrontend}/wallpapers`, {
  recursive: true,
});
