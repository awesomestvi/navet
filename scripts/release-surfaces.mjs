import fs from 'node:fs';
import process from 'node:process';
import { resolve } from 'node:path';
import { homeAssistantPaths, repoRoot } from './repo-paths.mjs';

export const root = repoRoot;
export const packageJsonPath = resolve(root, 'package.json');
export const changelogPath = resolve(root, 'CHANGELOG.md');
export const manifestPath = homeAssistantPaths.hacsNavetManifest;
export const platformManifestPath = homeAssistantPaths.platformNavetManifest;
export const addonConfigPath = homeAssistantPaths.addonConfig;
export const versioningDocPath = resolve(root, 'docs/VERSIONING.md');
export const appVersionPath = resolve(root, 'packages/app/src/constants/app-version.ts');

const versionPattern = /^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?$/;

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function writeText(filePath, value) {
  fs.writeFileSync(filePath, value, 'utf8');
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function getPackageVersion() {
  const packageJson = readJson(packageJsonPath);
  const version = packageJson.version?.trim();

  if (!version) {
    throw new Error('package.json is missing a version.');
  }

  return version;
}

export function assertValidVersion(version, context = 'version') {
  if (!versionPattern.test(version)) {
    throw new Error(`Invalid ${context}: "${version}". Expected pre-1.0 semver or prerelease.`);
  }
}

export function readAddonVersion(filePath = addonConfigPath) {
  const match = readText(filePath).match(/^version:\s*"?(.*?)"?\s*$/m);
  if (!match?.[1]) {
    throw new Error(`Unable to read version from ${filePath}.`);
  }

  return match[1].trim();
}

export function updateAddonVersion(version, filePath = addonConfigPath) {
  const content = readText(filePath);
  const nextContent = content.replace(/^version:\s*"?.*?"?\s*$/m, `version: "${version}"`);
  if (nextContent === content) {
    throw new Error(`Unable to update version in ${filePath}.`);
  }

  writeText(filePath, nextContent);
}

export function hasChangelogVersion(version) {
  const changelog = readText(changelogPath).replace(/\r\n/g, '\n');
  const headingPattern = /^##\s+(\d+\.\d+\.\d+(?:[-+][^\s]+)?)(?:\s+.*)?$/gm;
  return [...changelog.matchAll(headingPattern)].some((heading) => heading[1]?.trim() === version);
}

export function readVersioningCurrentVersion() {
  const match = readText(versioningDocPath).match(/^- current version:\s*`([^`]+)`\s*$/m);
  if (!match?.[1]) {
    throw new Error('Unable to read current version from docs/VERSIONING.md.');
  }

  return match[1].trim();
}

export function updateVersioningCurrentVersion(version) {
  const content = readText(versioningDocPath);
  const nextContent = content.replace(
    /^- current version:\s*`[^`]+`\s*$/m,
    `- current version: \`${version}\``
  );
  if (nextContent === content) {
    throw new Error('Unable to update current version in docs/VERSIONING.md.');
  }

  writeText(versioningDocPath, nextContent);
}

export function normalizeTagVersion(tag) {
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}
