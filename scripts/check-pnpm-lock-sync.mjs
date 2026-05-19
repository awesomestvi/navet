import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import YAML from 'yaml';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workspaceConfig = fs.existsSync('pnpm-workspace.yaml')
  ? YAML.parse(fs.readFileSync('pnpm-workspace.yaml', 'utf8'))
  : {};
const lockfile = YAML.parse(fs.readFileSync('pnpm-lock.yaml', 'utf8'));
const importer = lockfile.importers?.['.'];

if (!importer) {
  console.error('pnpm-lock.yaml is missing the root importer (".").');
  process.exit(1);
}

const manifestSections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

const lockfileSections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

/**
 * Return a stable map of package name -> specifier from package.json.
 */
function collectManifestSpecifiers() {
  const specifiers = new Map();

  for (const section of manifestSections) {
    const entries = Object.entries(packageJson[section] ?? {});
    for (const [name, specifier] of entries) {
      specifiers.set(name, String(specifier));
    }
  }

  return specifiers;
}

/**
 * Return a stable map of package name -> specifier from the root importer.
 */
function collectLockfileSpecifiers() {
  const specifiers = new Map();

  for (const section of lockfileSections) {
    const entries = Object.entries(importer[section] ?? {});
    for (const [name, details] of entries) {
      if (details && typeof details === 'object' && 'specifier' in details) {
        specifiers.set(name, String(details.specifier));
      }
    }
  }

  return specifiers;
}

function toSortedObject(record = {}) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
  );
}

const manifestSpecifiers = collectManifestSpecifiers();
const lockfileSpecifiers = collectLockfileSpecifiers();
const mismatches = [];

for (const [name, manifestSpecifier] of manifestSpecifiers) {
  const lockfileSpecifier = lockfileSpecifiers.get(name);
  if (lockfileSpecifier !== manifestSpecifier) {
    mismatches.push({
      name,
      manifest: manifestSpecifier,
      lockfile: lockfileSpecifier ?? '<missing>',
    });
  }
}

for (const [name, lockfileSpecifier] of lockfileSpecifiers) {
  if (!manifestSpecifiers.has(name)) {
    mismatches.push({
      name,
      manifest: '<missing>',
      lockfile: lockfileSpecifier,
    });
  }
}

const manifestOverrides = toSortedObject(workspaceConfig?.overrides ?? {});
const lockfileOverrides = toSortedObject(lockfile.overrides ?? {});

if (JSON.stringify(manifestOverrides) !== JSON.stringify(lockfileOverrides)) {
  mismatches.push({
    name: 'pnpm-workspace.overrides',
    manifest: JSON.stringify(manifestOverrides),
    lockfile: JSON.stringify(lockfileOverrides),
  });
}

if (mismatches.length > 0) {
  console.error('pnpm-lock.yaml is out of sync with package.json.');
  console.error('Run `pnpm install` and commit the updated lockfile.');
  console.error('');

  for (const mismatch of mismatches) {
    console.error(
      `- ${mismatch.name}: package.json=${mismatch.manifest} lockfile=${mismatch.lockfile}`
    );
  }

  process.exit(1);
}

const frozenLockfileCheck = spawnSync(
  'pnpm',
  ['install', '--lockfile-only', '--frozen-lockfile'],
  {
    env: {
      ...process.env,
      CI: 'true',
    },
    stdio: 'inherit',
  }
);

if (frozenLockfileCheck.error) {
  console.error('Failed to run pnpm frozen lockfile validation.');
  console.error(frozenLockfileCheck.error.message);
  process.exit(1);
}

if (frozenLockfileCheck.status !== 0) {
  console.error('');
  console.error('pnpm-lock.yaml failed frozen lockfile validation.');
  console.error('Run `pnpm install --lockfile-only` and commit the updated lockfile.');
  process.exit(frozenLockfileCheck.status ?? 1);
}

console.log('pnpm lockfile metadata matches package.json');
