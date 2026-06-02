import fs from 'node:fs';
import process from 'node:process';
import {
  addonConfigPath,
  appVersionPath,
  assertValidVersion,
  fail,
  getPackageVersion,
  hasChangelogVersion,
  manifestPath,
  normalizeTagVersion,
  readAddonVersion,
  readJson,
  readVersioningCurrentVersion,
} from './release-surfaces.mjs';

const args = process.argv.slice(2);
const tagArgIndex = args.findIndex((arg) => arg === '--tag');
const tagValue = tagArgIndex === -1 ? null : args[tagArgIndex + 1];

try {
  const packageVersion = getPackageVersion();
  assertValidVersion(packageVersion, 'package version');

  const manifest = readJson(manifestPath);
  const addonVersion = readAddonVersion(addonConfigPath);
  const versioningVersion = readVersioningCurrentVersion();

  if (manifest.version !== packageVersion) {
    throw new Error(
      `platform/home-assistant/custom_components/navet/manifest.json version ${manifest.version} does not match package.json ${packageVersion}.`
    );
  }

  if (addonVersion !== packageVersion) {
    throw new Error(
      `platform/home-assistant/addons/navet/config.yaml version ${addonVersion} does not match package.json ${packageVersion}.`
    );
  }

  if (versioningVersion !== packageVersion) {
    throw new Error(
      `docs/VERSIONING.md current version ${versioningVersion} does not match package.json ${packageVersion}.`
    );
  }

  if (!hasChangelogVersion(packageVersion)) {
    throw new Error(`CHANGELOG.md does not contain a section for ${packageVersion}.`);
  }

  const source = fs.readFileSync(appVersionPath, 'utf8');
  if (!source.includes('__APP_VERSION__')) {
    fail('packages/app/src/constants/app-version.ts must continue to source APP_VERSION from __APP_VERSION__.');
  }

  if (tagValue) {
    const normalizedTagVersion = normalizeTagVersion(tagValue.trim());

    if (normalizedTagVersion !== packageVersion) {
      throw new Error(`Git tag ${tagValue} does not match package.json version ${packageVersion}.`);
    }
  }

  console.log(`Release surfaces are aligned for ${getPackageVersion()}.`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
