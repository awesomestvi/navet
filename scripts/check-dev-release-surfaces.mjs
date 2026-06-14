import process from 'node:process';
import {
  assertMainRepositoryMetadata,
  fail,
  getPackageVersion,
  isValidDevAddonVersion,
} from './release-surfaces.mjs';

const args = process.argv.slice(2);
const tagArgIndex = args.findIndex((arg) => arg === '--tag');
const tagValue = tagArgIndex === -1 ? null : args[tagArgIndex + 1]?.trim();
const versionArgIndex = args.findIndex((arg) => arg === '--version');
const versionValue = versionArgIndex === -1 ? null : args[versionArgIndex + 1]?.trim();

try {
  if (!tagValue) {
    throw new Error('Missing required --tag argument.');
  }

  if (!versionValue) {
    throw new Error('Missing required --version argument.');
  }

  assertMainRepositoryMetadata();

  const packageVersion = getPackageVersion();

  if (!isValidDevAddonVersion(versionValue, packageVersion)) {
    throw new Error(
      `Navet Dev version ${versionValue} must match ${packageVersion}-dev.YYYYMMDDHHMMSS.`
    );
  }

  const expectedTag = `navet-dev-${versionValue}`;
  if (tagValue !== expectedTag) {
    throw new Error(
      `Git tag ${tagValue} does not match Navet Dev version ${versionValue}. Expected ${expectedTag}.`
    );
  }

  console.log(`Navet Dev release surfaces are aligned for ${versionValue}.`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
