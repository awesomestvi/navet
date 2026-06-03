import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'vite';
import { assetPaths, homeAssistantPaths, appPaths, repoRoot } from './repo-paths.mjs';

await build({ configFile: `${repoRoot}/apps/ha-panel/vite.config.ts` });

await rm(homeAssistantPaths.platformNavetFrontend, { recursive: true, force: true });
await cp(appPaths.haPanelDist, homeAssistantPaths.platformNavetFrontend, { recursive: true });
await mkdir(`${homeAssistantPaths.platformNavetFrontend}/wallpapers`, { recursive: true });
await cp(`${assetPaths.public}/logo.svg`, `${homeAssistantPaths.platformNavetFrontend}/logo.svg`);
await cp(`${assetPaths.public}/wallpapers`, `${homeAssistantPaths.platformNavetFrontend}/wallpapers`, {
  recursive: true,
});
