#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const providerLabDirectory = path.join(repositoryRoot, 'testing/provider-lab');
const homeyAppDirectory = path.join(providerLabDirectory, 'homey-fixture-app');
const require = createRequire(import.meta.url);
const homeyFixtures = require(path.join(homeyAppDirectory, 'lib/fixtures.js'));
let lastHomeyApiRequestAt = 0;

function printUsage() {
  console.log(`Usage:
  pnpm provider-lab:install -- --compose-dir /path/to/docker
  pnpm provider-lab:openhab -- --compose-dir /path/to/docker
  pnpm provider-lab:homey

Options:
  --compose-dir <path>  Directory containing the openHAB Compose file and openhab/conf
  --openhab-conf <path> Override the mounted openHAB conf directory
  --openhab-url <url>   URL used to verify openHAB (default: http://localhost:8080)
  --no-restart          Copy openHAB fixtures without restarting the service
  --refresh-homey-icons Recreate managed Homey fixtures whose icon is outdated
  --help                Show this help

The installers are additive and idempotent. They only manage Navet-prefixed fixtures.`);
}

function parseArguments(argv) {
  const options = {
    provider: null,
    composeDirectory: process.env.NAVET_PROVIDER_LAB_COMPOSE_DIR ?? null,
    openhabConf: process.env.NAVET_PROVIDER_LAB_OPENHAB_CONF ?? null,
    openhabUrl: process.env.NAVET_PROVIDER_LAB_OPENHAB_URL ?? 'http://localhost:8080',
    restart: true,
    refreshHomeyIcons: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--help' || argument === '-h') {
      printUsage();
      process.exit(0);
    }
    if (argument === '--no-restart') {
      options.restart = false;
      continue;
    }
    if (argument === '--refresh-homey-icons') {
      options.refreshHomeyIcons = true;
      continue;
    }
    if (
      argument === '--compose-dir' ||
      argument === '--openhab-conf' ||
      argument === '--openhab-url'
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value.`);
      if (argument === '--compose-dir') options.composeDirectory = value;
      if (argument === '--openhab-conf') options.openhabConf = value;
      if (argument === '--openhab-url') options.openhabUrl = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--compose-dir=')) {
      options.composeDirectory = argument.slice('--compose-dir='.length);
      continue;
    }
    if (argument.startsWith('--openhab-conf=')) {
      options.openhabConf = argument.slice('--openhab-conf='.length);
      continue;
    }
    if (argument.startsWith('--openhab-url=')) {
      options.openhabUrl = argument.slice('--openhab-url='.length);
      continue;
    }
    if (!options.provider && ['all', 'openhab', 'homey'].includes(argument)) {
      options.provider = argument;
      continue;
    }
    throw new Error(`Unknown argument "${argument}".`);
  }

  if (!options.provider) throw new Error('Choose all, openhab, or homey.');
  return options;
}

function run(command, args, { cwd = repositoryRoot, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: capture ? 'pipe' : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(detail || `${command} exited with status ${result.status}.`);
  }
  return result.stdout ?? '';
}

function parseJsonOutput(output) {
  const normalized = output.replaceAll(/\u001B\[[0-?]*[ -/]*[@-~]/g, '').trim();
  const objectStart = normalized.indexOf('{');
  const arrayStart = normalized.indexOf('[');
  const start = [objectStart, arrayStart].filter((value) => value >= 0).sort((a, b) => a - b)[0];
  if (start === undefined) throw new Error(`Expected JSON output, received: ${normalized}`);
  return JSON.parse(normalized.slice(start));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function copyManagedFixture(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  let unchanged = false;
  try {
    unchanged = (await readFile(source)).equals(await readFile(destination));
  } catch {
    // The destination does not exist yet.
  }

  if (unchanged) {
    console.log(`Already current: ${destination}`);
    return;
  }

  await copyFile(source, destination);
  console.log(`Installed: ${destination}`);
}

async function verifyOpenHAB(baseUrl) {
  const verificationUrl = new URL('/rest/items/NavetLiving_Temperature', baseUrl);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(verificationUrl, { headers: { Accept: 'application/json' } });
      if (response.ok) {
        const item = await response.json();
        if (item.name === 'NavetLiving_Temperature' && item.state !== 'NULL') {
          console.log(`Verified openHAB fixture: ${item.name} = ${item.state}`);
          return;
        }
      }
    } catch {
      // openHAB is still restarting.
    }
    await delay(2000);
  }
  throw new Error(
    `openHAB did not expose the seeded fixture at ${verificationUrl} within 60 seconds.`
  );
}

async function installOpenHAB(options) {
  const composeDirectory = options.composeDirectory
    ? path.resolve(options.composeDirectory)
    : options.openhabConf
      ? path.resolve(options.openhabConf, '../..')
      : null;
  if (!composeDirectory && !options.openhabConf) {
    throw new Error('openHAB requires --compose-dir or --openhab-conf.');
  }

  const openhabConf = path.resolve(
    options.openhabConf ?? path.join(composeDirectory, 'openhab/conf')
  );
  await access(openhabConf);

  await copyManagedFixture(
    path.join(providerLabDirectory, 'openhab/conf/items/navet-lab.items'),
    path.join(openhabConf, 'items/navet-lab.items')
  );
  await copyManagedFixture(
    path.join(providerLabDirectory, 'openhab/conf/rules/navet-lab.rules'),
    path.join(openhabConf, 'rules/navet-lab.rules')
  );

  if (options.restart) {
    if (!composeDirectory) {
      throw new Error('--no-restart is required when no Compose directory is available.');
    }
    run('docker', ['compose', 'restart', 'openhab'], { cwd: composeDirectory });
  }
  await verifyOpenHAB(options.openhabUrl);
}

function getHomeyCliPath() {
  return path.join(homeyAppDirectory, 'node_modules/.bin/homey');
}

async function ensureHomeyCli() {
  const cliPath = getHomeyCliPath();
  try {
    await access(cliPath);
  } catch {
    console.log('Installing the pinned Homey CLI dependency...');
    run('npm', ['ci'], { cwd: homeyAppDirectory });
  }
  return cliPath;
}

function runHomey(cliPath, args, { capture = false } = {}) {
  if (args[0] === 'api') {
    const elapsed = Date.now() - lastHomeyApiRequestAt;
    const waitMilliseconds = Math.max(0, 5000 - elapsed);
    if (waitMilliseconds > 0) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMilliseconds);
    }
    lastHomeyApiRequestAt = Date.now();
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return run(cliPath, args, { cwd: homeyAppDirectory, capture });
    } catch (error) {
      if (!String(error.message).includes('Too many requests') || attempt === 4) throw error;
      const waitMilliseconds = 15000;
      console.log(`Homey rate limit reached; retrying in ${waitMilliseconds / 1000}s...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMilliseconds);
    }
  }
}

function installHomeyApp(cliPath) {
  try {
    runHomey(cliPath, ['app', 'install'], { capture: true });
  } catch (error) {
    if (!String(error.message).includes('Homey Not Found')) throw error;
    console.log('The selected Homey is stale. Choose the active test server:');
    runHomey(cliPath, ['select']);
    runHomey(cliPath, ['app', 'install']);
    return;
  }
  console.log('Installed or updated the Homey fixture app.');
}

function homeyApi(cliPath, manager, operation, args = []) {
  return parseJsonOutput(
    runHomey(cliPath, ['api', manager, operation, '--json', ...args], { capture: true })
  );
}

function normalizeLabel(value) {
  return value.trim().toLocaleLowerCase();
}

function resolveFixtureZone(fixture, zones) {
  const candidates = fixture.zoneCandidates.map(normalizeLabel);
  return (
    Object.values(zones).find((zone) => candidates.includes(normalizeLabel(zone.name))) ??
    Object.values(zones).find((zone) => zone.parent === null) ??
    Object.values(zones)[0]
  );
}

function getCurrentFixtureState(fixture, device) {
  return Object.fromEntries(
    fixture.capabilities.map((capabilityId) => [
      capabilityId,
      device.capabilitiesObj?.[capabilityId]?.value ?? fixture.initialState[capabilityId],
    ])
  );
}

async function installHomey(options) {
  const cliPath = await ensureHomeyCli();
  runHomey(cliPath, ['app', 'validate']);
  installHomeyApp(cliPath);

  const drivers = homeyApi(cliPath, 'drivers', 'get-drivers');
  const driverId = Object.keys(drivers).find((id) =>
    id.endsWith(':com.navet.provider-lab:fixture')
  );
  if (!driverId) throw new Error('The installed Homey fixture driver was not found.');

  const zones = homeyApi(cliPath, 'zones', 'get-zones');
  const existingDevices = homeyApi(cliPath, 'devices', 'get-devices');
  const fixturesByNativeId = new Map(
    Object.values(existingDevices)
      .filter((device) => device.driverId === driverId && device.data?.id)
      .map((device) => [device.data.id, device])
  );

  const replacedDevicesByNativeId = new Map();
  if (options.refreshHomeyIcons) {
    for (const fixture of homeyFixtures) {
      const device = fixturesByNativeId.get(fixture.id);
      if (device && device.icon !== fixture.icon) {
        replacedDevicesByNativeId.set(fixture.id, device);
        runHomey(cliPath, ['api', 'devices', 'delete-device', '--id', device.id]);
        fixturesByNativeId.delete(fixture.id);
        console.log(`Refreshing Homey icon: ${fixture.name}`);
      }
    }
  }

  const missingFixtures = homeyFixtures.filter(
    (fixture) => !fixturesByNativeId.has(fixture.id)
  );
  const fallbackZone = resolveFixtureZone(homeyFixtures[0], zones);
  const pairSession =
    missingFixtures.length > 0
      ? homeyApi(cliPath, 'drivers', 'create-pair-session', [
          '--body',
          JSON.stringify({ type: 'pair', driverId, zoneId: fallbackZone.id }),
        ])
      : null;

  try {
    for (const fixture of homeyFixtures) {
      const replacedDevice = replacedDevicesByNativeId.get(fixture.id);
      const zone = zones[replacedDevice?.zone] ?? resolveFixtureZone(fixture, zones);
      let device = fixturesByNativeId.get(fixture.id);
      if (!device) {
        if (!pairSession) throw new Error('Homey pairing session was not created.');
        const initialState = replacedDevice
          ? getCurrentFixtureState(fixture, replacedDevice)
          : fixture.initialState;
        device = homeyApi(cliPath, 'drivers', 'create-pair-session-device', [
          '--id',
          pairSession.id,
          '--body',
          JSON.stringify({
            name: fixture.name,
            data: { id: fixture.id },
            zone: zone.id,
            store: { deviceClass: fixture.deviceClass, initialState },
            icon: fixture.icon,
            capabilities: fixture.capabilities,
            capabilitiesOptions: fixture.capabilitiesOptions,
            class: fixture.deviceClass,
          }),
        ]);
        fixturesByNativeId.set(fixture.id, device);
        console.log(`Added Homey fixture: ${fixture.name}`);
      } else {
        console.log(`Already installed: ${fixture.name}`);
      }

      if (device.zone !== zone.id) {
        homeyApi(cliPath, 'devices', 'update-device', [
          '--id',
          device.id,
          '--body',
          JSON.stringify({ zone: zone.id }),
        ]);
      }
      console.log(`  Zone: ${zone.name}`);
    }
  } finally {
    if (pairSession) {
      runHomey(cliPath, ['api', 'drivers', 'delete-pair-session', '--id', pairSession.id]);
    }
  }

  const installedIds = new Set(
    [...fixturesByNativeId.values()].map((device) => device.data?.id)
  );
  const missing = homeyFixtures.filter((fixture) => !installedIds.has(fixture.id));
  if (missing.length > 0) {
    throw new Error(
      `Homey fixtures missing after installation: ${missing.map(({ name }) => name).join(', ')}`
    );
  }
  const incorrectIcons = homeyFixtures.filter((fixture) => {
    const device = fixturesByNativeId.get(fixture.id);
    return device?.icon !== fixture.icon;
  });
  if (incorrectIcons.length > 0) {
    const names = incorrectIcons.map(({ name }) => name).join(', ');
    if (options.refreshHomeyIcons) {
      throw new Error(`Homey fixture icons incorrect after installation: ${names}`);
    }
    console.warn(
      `Existing Homey fixtures still use an older icon: ${names}. ` +
        'Run again with --refresh-homey-icons to recreate those managed fixtures.'
    );
  }
  console.log(`Verified ${homeyFixtures.length} Homey fixture devices.`);
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.provider === 'openhab' || options.provider === 'all') await installOpenHAB(options);
  if (options.provider === 'homey' || options.provider === 'all') await installHomey(options);
} catch (error) {
  console.error(`Provider lab installation failed: ${error.message}`);
  process.exitCode = 1;
}
