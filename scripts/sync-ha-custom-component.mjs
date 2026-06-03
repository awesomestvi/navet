import { cp, rm } from 'node:fs/promises';
import { homeAssistantPaths } from './repo-paths.mjs';

export async function syncHaCustomComponentToPlatform() {
  await rm(homeAssistantPaths.platformNavetCustomComponent, {
    recursive: true,
    force: true,
  });

  await cp(
    homeAssistantPaths.hacsNavetCustomComponent,
    homeAssistantPaths.platformNavetCustomComponent,
    { recursive: true }
  );
}
