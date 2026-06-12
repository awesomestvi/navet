import process from 'node:process';
import {
  addonDevConfigPath,
  assertMainRepositoryMetadata,
  fail,
  getPackageVersion,
  isValidDevAddonVersion,
  readAddonVersion,
} from './release-surfaces.mjs';

const args = process.argv.slice(2);
const tagArgIndex = args.findIndex((arg) => arg === '--tag');
const tagValue = tagArgIndex === -1 ? null : args[tagArgIndex + 1]?.trim();

try {
  if (!tagValue) {
    throw new Error('Missing required --tag argument.');
  }

  assertMainRepositoryMetadata();

  const packageVersion = getPackageVersion();
  const addonDevVersion = readAddonVersion(addonDevConfigPath);

  if (!isValidDevAddonVersion(addonDevVersion, packageVersion)) {
    throw new Error(
      `platform/home-assistant/addons/navet-dev/config.yaml version ${addonDevVersion} must match ${packageVersion}-dev.YYYYMMDDHHMMSS.`
    );
  }

  const expectedTag = `navet-dev-${addonDevVersion}`;
  if (tagValue !== expectedTag) {
    throw new Error(
      `Git tag ${tagValue} does not match committed Navet Dev version ${addonDevVersion}. Expected ${expectedTag}.`
    );
  }

  console.log(`Navet Dev release surfaces are aligned for ${addonDevVersion}.`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
