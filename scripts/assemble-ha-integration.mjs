import fs from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

function isInsideFrontend(sourceRoot, sourcePath) {
  const sourceFrontend = resolve(sourceRoot, 'frontend');
  return sourcePath === sourceFrontend || sourcePath.startsWith(`${sourceFrontend}${sep}`);
}

export async function assembleHomeAssistantIntegration({
  sourceRoot,
  panelDist,
  destination,
}) {
  const requiredPanelFiles = ['navet-panel.js', 'navet-ha-shell.js'];
  for (const filename of requiredPanelFiles) {
    const filePath = resolve(panelDist, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Home Assistant panel build is missing ${filename}: ${filePath}`);
    }
  }

  await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(sourceRoot, destination, {
    recursive: true,
    filter: (sourcePath) => !isInsideFrontend(sourceRoot, sourcePath),
  });
  await cp(panelDist, resolve(destination, 'frontend'), { recursive: true });

  return {
    destination,
    frontend: resolve(destination, 'frontend'),
    source: relative(process.cwd(), sourceRoot),
  };
}
