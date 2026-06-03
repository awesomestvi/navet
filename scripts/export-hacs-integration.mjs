import fs from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assertHacsExport,
  changelogPath,
  getPackageVersion,
  manifestPath,
  readJson,
} from './release-surfaces.mjs';
import { appPaths, homeAssistantPaths } from './repo-paths.mjs';

const exportRoot = appPaths.siblingHacsRepoRoot;
const sourceManifestPath = manifestPath;

if (!fs.existsSync(sourceManifestPath)) {
  throw new Error(`HACS source manifest is missing: ${sourceManifestPath}`);
}

const sourceManifest = readJson(sourceManifestPath);
const packageVersion = getPackageVersion();

try {
  const result = execFileSync('git', ['-C', exportRoot, 'rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf8',
  }).trim();

  if (result !== 'true') {
    throw new Error(`Target path is not a git worktree: ${exportRoot}`);
  }
} catch (error) {
  throw new Error(`Target HACS repository must be a git repo: ${exportRoot}`, {
    cause: error instanceof Error ? error : undefined,
  });
}

if (fs.existsSync(resolve(exportRoot, 'repository.yaml'))) {
  throw new Error(`Target HACS repository must not contain repository.yaml: ${exportRoot}`);
}

if (sourceManifest.version !== packageVersion) {
  throw new Error(
    `HACS source manifest version ${sourceManifest.version} does not match package.json ${packageVersion}.`
  );
}

await mkdir(resolve(exportRoot, 'custom_components'), { recursive: true });
await rm(resolve(exportRoot, 'custom_components/navet'), { recursive: true, force: true });
await cp(
  homeAssistantPaths.platformNavetCustomComponent,
  resolve(exportRoot, 'custom_components/navet'),
  { recursive: true }
);
await cp(homeAssistantPaths.hacsMetadataTemplate, resolve(exportRoot, 'hacs.json'));
await cp(homeAssistantPaths.hacsReadmeTemplate, resolve(exportRoot, 'README.md'));
await cp(changelogPath, resolve(exportRoot, 'CHANGELOG.md'));

const targetManifestPath = resolve(exportRoot, 'custom_components/navet/manifest.json');
const targetManifest = readJson(targetManifestPath);

if (targetManifest.version !== packageVersion) {
  throw new Error(
    `HACS export manifest version ${targetManifest.version} does not match package.json ${packageVersion}.`
  );
}

assertHacsExport(exportRoot);

console.log(`Exported Home Assistant HACS repo to ${exportRoot}.`);
