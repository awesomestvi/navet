import {
  addonConfigPath,
  assertValidVersion,
  getPackageVersion,
  manifestPath,
  readJson,
  updateAddonVersion,
  updateVersioningCurrentVersion,
  writeJson,
} from './release-surfaces.mjs';

const packageVersion = getPackageVersion();
assertValidVersion(packageVersion, 'package version');

const manifest = readJson(manifestPath);
manifest.version = packageVersion;
writeJson(manifestPath, manifest);

updateAddonVersion(packageVersion, addonConfigPath);
updateVersioningCurrentVersion(packageVersion);

console.log(`Synchronized release-managed versions to ${packageVersion}.`);
