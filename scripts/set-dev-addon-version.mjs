import { homeAssistantPaths } from './repo-paths.mjs';
import {
  assertValidVersion,
  buildDevAddonVersion,
  getPackageVersion,
  isValidDevAddonVersion,
  readAddonVersion,
  updateAddonVersion,
} from './release-surfaces.mjs';

function parseArgs(argv) {
  const options = {
    version: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--version') {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error('Missing value for --version.');
      }

      options.version = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

const packageVersion = getPackageVersion();
assertValidVersion(packageVersion, 'package version');

const options = parseArgs(process.argv.slice(2));
const nextVersion = options.version ?? buildDevAddonVersion(packageVersion);

if (!isValidDevAddonVersion(nextVersion, packageVersion)) {
  throw new Error(
    `Navet Dev add-on version ${nextVersion} must match ${packageVersion}-dev.YYYYMMDDHHMMSS.`
  );
}

const currentVersion = readAddonVersion(homeAssistantPaths.addonNavetDev + '/config.yaml');

if (currentVersion === nextVersion) {
  console.log(`Navet Dev add-on version is already ${nextVersion}.`);
  process.exit(0);
}

updateAddonVersion(nextVersion, `${homeAssistantPaths.addonNavetDev}/config.yaml`);
console.log(`Updated Navet Dev add-on version to ${nextVersion}.`);
