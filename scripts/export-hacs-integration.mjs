import fs from 'node:fs';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  assertHacsExport,
  changelogPath,
  getPackageVersion,
  manifestPath,
  readJson,
} from './release-surfaces.mjs';
import { assembleHomeAssistantIntegration } from './assemble-ha-integration.mjs';
import { appPaths, homeAssistantPaths } from './repo-paths.mjs';
import { renderHacsChangelog } from './hacs-changelog.mjs';

const exportRoot = process.env.NAVET_HACS_EXPORT_ROOT
  ? resolve(process.env.NAVET_HACS_EXPORT_ROOT)
  : appPaths.siblingHacsRepoRoot;
const sourceManifestPath = manifestPath;

if (process.env.NAVET_SKIP_HA_PANEL_BUILD !== '1') {
  execFileSync(process.execPath, ['scripts/build-ha-panel.mjs'], {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit',
  });
}

if (!fs.existsSync(sourceManifestPath)) {
  throw new Error(`HACS source manifest is missing: ${sourceManifestPath}`);
}

const sourceManifest = readJson(sourceManifestPath);
const packageVersion = getPackageVersion();
const releaseVersion = process.env.NAVET_RELEASE_VERSION?.trim() || packageVersion;
const releaseNotesFile = process.env.NAVET_RELEASE_NOTES_FILE?.trim();

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

if (!process.env.NAVET_RELEASE_VERSION && sourceManifest.version !== packageVersion) {
  throw new Error(
    `HACS source manifest version ${sourceManifest.version} does not match package.json ${packageVersion}.`
  );
}

await mkdir(resolve(exportRoot, 'custom_components'), { recursive: true });
await assembleHomeAssistantIntegration({
  sourceRoot: homeAssistantPaths.platformNavetCustomComponent,
  panelDist: appPaths.haPanelDist,
  destination: resolve(exportRoot, 'custom_components/navet'),
});
await cp(homeAssistantPaths.hacsMetadataTemplate, resolve(exportRoot, 'hacs.json'));
await cp(homeAssistantPaths.hacsReadmeTemplate, resolve(exportRoot, 'README.md'));
await cp(homeAssistantPaths.hacsLicenseTemplate, resolve(exportRoot, 'LICENSE'));
await mkdir(resolve(exportRoot, '.github/workflows'), { recursive: true });
await cp(
  homeAssistantPaths.hacsValidationWorkflowTemplate,
  resolve(exportRoot, '.github/workflows/validate.yml')
);

const targetManifestPath = resolve(exportRoot, 'custom_components/navet/manifest.json');
const targetManifest = { ...readJson(targetManifestPath), version: releaseVersion };
await writeFile(targetManifestPath, `${JSON.stringify(targetManifest, null, 2)}\n`, 'utf8');

if (releaseNotesFile) {
  const releaseNotes = (await readFile(resolve(releaseNotesFile), 'utf8')).trim();
  const releaseDate = new Date().toISOString().slice(0, 10);
  const targetChangelogPath = resolve(exportRoot, 'CHANGELOG.md');
  const existingChangelog = fs.existsSync(targetChangelogPath)
    ? await readFile(targetChangelogPath, 'utf8')
    : '';
  await writeFile(
    targetChangelogPath,
    renderHacsChangelog({ releaseVersion, releaseDate, releaseNotes, existingChangelog }),
    'utf8'
  );
} else {
  await cp(changelogPath, resolve(exportRoot, 'CHANGELOG.md'));
}

if (targetManifest.version !== releaseVersion) {
  throw new Error(
    `HACS export manifest version ${targetManifest.version} does not match release version ${releaseVersion}.`
  );
}

assertHacsExport(exportRoot, { expectedVersion: releaseVersion });

console.log(`Exported Home Assistant HACS repo to ${exportRoot}.`);
