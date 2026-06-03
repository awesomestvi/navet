import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'vite';
import { assetPaths, homeAssistantPaths, appPaths, repoRoot } from './repo-paths.mjs';
import { syncHaCustomComponentToPlatform } from './sync-ha-custom-component.mjs';

await build({ configFile: `${repoRoot}/apps/ha-panel/vite.config.ts` });

await rm(homeAssistantPaths.hacsNavetFrontend, { recursive: true, force: true });
await cp(appPaths.haPanelDist, homeAssistantPaths.hacsNavetFrontend, { recursive: true });
await mkdir(`${homeAssistantPaths.hacsNavetFrontend}/wallpapers`, { recursive: true });
await cp(`${assetPaths.public}/logo.svg`, `${homeAssistantPaths.hacsNavetFrontend}/logo.svg`);
await cp(`${assetPaths.public}/wallpapers`, `${homeAssistantPaths.hacsNavetFrontend}/wallpapers`, {
  recursive: true,
});
await syncHaCustomComponentToPlatform();
