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
import { syncHaCustomComponentToPlatform } from './sync-ha-custom-component.mjs';

const packageVersion = getPackageVersion();
assertValidVersion(packageVersion, 'package version');

const manifest = readJson(manifestPath);
manifest.version = packageVersion;
writeJson(manifestPath, manifest);
await syncHaCustomComponentToPlatform();

updateAddonVersion(packageVersion, addonConfigPath);
updateVersioningCurrentVersion(packageVersion);

console.log(`Synchronized release-managed versions to ${packageVersion}.`);
