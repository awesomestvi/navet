import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { repoRoot } from './repo-paths.mjs';
import { assertNotes, changelogNotes, normalizeNotes } from './release-note-contract.mjs';

const args = process.argv.slice(2);
const valueFor = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
};

const root = resolve(valueFor('--root', repoRoot));
const channel = valueFor('--channel');
const version = valueFor('--version');
const notesFile = valueFor('--notes-file');
const releaseTag = valueFor('--tag');

if (!['stable', 'dev'].includes(channel) || !version || !notesFile || !releaseTag) {
  throw new Error(
    'Usage: prepare-addon-release-metadata.mjs --channel <stable|dev> --version <version> --tag <tag> --notes-file <path> [--root <path>]',
  );
}

if (!/^\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(version)) {
  throw new Error(`Unsupported Home Assistant App version: ${version}`);
}

const addonDirectory = resolve(
  root,
  channel === 'stable'
    ? 'platform/home-assistant/addons/navet'
    : 'platform/home-assistant/addons/navet-dev',
);
const configPath = resolve(addonDirectory, 'config.yaml');
const changelogPath = resolve(addonDirectory, 'CHANGELOG.md');
const sourceConfig = await readFile(configPath, 'utf8');
if (!/^version:\s*.*$/m.test(sourceConfig)) {
  throw new Error(`Add-on config is missing version: ${configPath}`);
}

const nextConfig = sourceConfig.replace(/^version:\s*.*$/m, `version: "${version}"`);

const releaseNotes = normalizeNotes(await readFile(resolve(notesFile), 'utf8'));
const currentChangelog = await readFile(changelogPath, 'utf8');
const versionHeading = `## ${version}`;
const existing = changelogNotes(currentChangelog, version);
if (existing !== null) assertNotes(existing, releaseNotes, `Home Assistant ${version}`);
if (existing === null) {
  const history = currentChangelog
    .replace(/\r\n/g, '\n')
    .replace(/^# Changelog\s*/, '')
    .trim();
  const nextChangelog = [
    '# Changelog',
    '',
    versionHeading,
    '',
    releaseNotes,
    ...(history ? ['', history] : []),
    '',
  ].join('\n');
  await writeFile(changelogPath, nextChangelog, 'utf8');
}
await writeFile(configPath, nextConfig, 'utf8');

const fragmentName = `release-metadata-${releaseTag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.yaml`;
const fragmentDirectory = resolve(root, '.changes');
await mkdir(fragmentDirectory, { recursive: true });
await writeFile(
  resolve(fragmentDirectory, fragmentName),
  [
    'type: internal',
    'audiences: []',
    `summary: Published Home Assistant App metadata for ${version}.`,
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Prepared ${channel} Home Assistant App metadata for ${version}.`);
