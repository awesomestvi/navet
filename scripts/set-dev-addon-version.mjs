import { homeAssistantPaths } from './repo-paths.mjs';
import {
  buildDevAddonVersion,
  getPackageVersion,
  readAddonVersion,
  updateAddonVersion,
} from './release-surfaces.mjs';

const packageVersion = getPackageVersion();
const nextVersion = buildDevAddonVersion(packageVersion);
const currentVersion = readAddonVersion(homeAssistantPaths.addonNavetDev + '/config.yaml');

if (currentVersion === nextVersion) {
  console.log(`Navet Dev add-on version is already ${nextVersion}.`);
  process.exit(0);
}

updateAddonVersion(nextVersion, `${homeAssistantPaths.addonNavetDev}/config.yaml`);
console.log(`Updated Navet Dev add-on version to ${nextVersion}.`);
