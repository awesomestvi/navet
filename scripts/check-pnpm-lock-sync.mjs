import fs from 'node:fs';
import process from 'node:process';
import YAML from 'yaml';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
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

const manifestOverrides = toSortedObject(packageJson.pnpm?.overrides ?? {});
const lockfileOverrides = toSortedObject(lockfile.overrides ?? {});

if (JSON.stringify(manifestOverrides) !== JSON.stringify(lockfileOverrides)) {
  mismatches.push({
    name: 'pnpm.overrides',
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

console.log('pnpm lockfile metadata matches package.json');
