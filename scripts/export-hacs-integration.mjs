import fs from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertHacsExport,
  changelogPath,
  getPackageVersion,
  manifestPath,
  readJson,
} from './release-surfaces.mjs';
import { appPaths, homeAssistantPaths } from './repo-paths.mjs';

const exportRoot = appPaths.homeAssistantHacsRepoDist;

await rm(exportRoot, { recursive: true, force: true });
await mkdir(exportRoot, { recursive: true });

await cp(
  homeAssistantPaths.platformNavetCustomComponent,
  resolve(exportRoot, 'custom_components/navet'),
  { recursive: true }
);
await cp(homeAssistantPaths.hacsMetadataTemplate, resolve(exportRoot, 'hacs.json'));
await cp(homeAssistantPaths.hacsReadmeTemplate, resolve(exportRoot, 'README.md'));
await cp(changelogPath, resolve(exportRoot, 'CHANGELOG.md'));

const targetManifestPath = resolve(exportRoot, 'custom_components/navet/manifest.json');
const packageVersion = getPackageVersion();
const sourceManifest = readJson(manifestPath);
const targetManifest = readJson(targetManifestPath);

if (sourceManifest.version !== packageVersion || targetManifest.version !== packageVersion) {
  throw new Error(
    `HACS manifest version drift detected. package.json=${packageVersion}, source=${sourceManifest.version}, target=${targetManifest.version}`
  );
}

assertHacsExport(exportRoot);

const frontendRoot = resolve(exportRoot, 'custom_components/navet/frontend');
if (!fs.existsSync(frontendRoot) || !fs.statSync(frontendRoot).isDirectory()) {
  throw new Error(`HACS export is missing frontend assets: ${frontendRoot}`);
}

const requiredFrontendFiles = ['navet-panel.js', '.vite/manifest.json'];
for (const file of requiredFrontendFiles) {
  const filePath = resolve(frontendRoot, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`HACS export is missing required frontend asset: ${filePath}`);
  }
}

const targetFiles = fs.readdirSync(exportRoot);
if (targetFiles.includes('platform')) {
  throw new Error(`HACS export must not contain platform/: ${resolve(exportRoot, 'platform')}`);
}

const forbiddenAddonFiles = [
  'config.yaml',
  'Dockerfile',
  'build.yaml',
  'rootfs',
  'navet',
  'navet-dev',
];

for (const entry of forbiddenAddonFiles) {
  if (fs.existsSync(resolve(exportRoot, entry))) {
    throw new Error(`HACS export contains forbidden add-on packaging surface: ${entry}`);
  }
}

const targetReadme = fs.readFileSync(resolve(exportRoot, 'README.md'), 'utf8');
if (!targetReadme.includes('navet-hacs')) {
  throw new Error('HACS README template sync failed.');
}

console.log(`Exported Home Assistant HACS repo to ${exportRoot}.`);
