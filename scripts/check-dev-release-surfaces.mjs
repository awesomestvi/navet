import process from 'node:process';
import {
  addonDevConfigPath,
  assertMainRepositoryMetadata,
  fail,
  isValidDevAddonVersion,
  readAddonVersion,
} from './release-surfaces.mjs';

const args = process.argv.slice(2);
const tagArgIndex = args.findIndex((arg) => arg === '--tag');
const tagValue = tagArgIndex === -1 ? null : args[tagArgIndex + 1]?.trim();
const versionArgIndex = args.findIndex((arg) => arg === '--version');
const versionValue = versionArgIndex === -1 ? null : args[versionArgIndex + 1]?.trim();
const allowStaleAddonMetadata = args.includes('--allow-stale-addon-metadata');

try {
  if (!tagValue) {
    throw new Error('Missing required --tag argument.');
  }

  if (!versionValue) {
    throw new Error('Missing required --version argument.');
  }

  assertMainRepositoryMetadata();

  if (!isValidDevAddonVersion(versionValue)) {
    throw new Error(
      `Navet Dev version ${versionValue} must match X.Y.Z-dev.YYYYMMDDHHMMSS.`
    );
  }

  const addonVersion = readAddonVersion(addonDevConfigPath);
  if (addonVersion !== versionValue && !allowStaleAddonMetadata) {
    throw new Error(
      `Navet Dev add-on version ${addonVersion} does not match requested version ${versionValue}.`
    );
  }

  const expectedTag = `navet-dev-${versionValue}`;
  if (tagValue !== expectedTag) {
    throw new Error(
      `Git tag ${tagValue} does not match Navet Dev version ${versionValue}. Expected ${expectedTag}.`
    );
  }

  if (addonVersion !== versionValue) {
    console.log(
      `Navet Dev artifacts are aligned for ${versionValue}; protected main retains add-on metadata ${addonVersion}.`
    );
  } else {
    console.log(`Navet Dev release surfaces are aligned for ${versionValue}.`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
