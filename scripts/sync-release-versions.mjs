import {
  addonDevConfigPath,
  addonConfigPath,
  assertValidVersion,
  buildDevAddonVersion,
  getPackageVersion,
  manifestPath,
  readJson,
  readAddonVersion,
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

const nextDevAddonVersion = buildDevAddonVersion(packageVersion);
const currentDevAddonVersion = readAddonVersion(addonDevConfigPath);
if (currentDevAddonVersion !== nextDevAddonVersion) {
  updateAddonVersion(nextDevAddonVersion, addonDevConfigPath);
}

console.log(
  `Synchronized release-managed versions to ${packageVersion} and refreshed Navet Dev to ${nextDevAddonVersion}.`
);
