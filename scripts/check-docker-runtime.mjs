import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
}

function ensureDockerAvailable() {
  const result = spawnSync('docker', ['info'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (!result.error && result.status === 0) {
    return;
  }

  const message =
    result.error?.message ||
    result.stderr ||
    result.stdout ||
    'Docker is unavailable. Start Docker Desktop or another Docker daemon and try again.';
  throw new Error(`check:docker requires a running Docker daemon.\n${message.trim()}`);
}

function ensureSerializedProfileRuntime() {
  const workerConfigs = [
    'docker/nginx.main.conf',
    'platform/home-assistant/addons/navet/rootfs/etc/nginx/nginx.conf',
  ];
  for (const file of workerConfigs) {
    const source = readFileSync(file, 'utf8');
    if (!/^\s*worker_processes\s+1\s*;/m.test(source)) {
      throw new Error(`${file} must serialize local profile-store writes with one Nginx worker`);
    }
  }

  const addonConfigs = [
    'platform/home-assistant/addons/navet/config.yaml',
    'platform/home-assistant/addons/navet-dev/config.yaml',
  ];
  for (const file of addonConfigs) {
    const source = readFileSync(file, 'utf8');
    if (/^ports(?:_description)?:/m.test(source)) {
      throw new Error(`${file} must remain Ingress-only without a published host port`);
    }
  }
}

function readAuthMetadata(containerName) {
  const result = spawnSync(
    'docker',
    [
      'exec',
      containerName,
      'wget',
      '-qO-',
      'http://127.0.0.1/__navet_auth__/session',
    ],
    {
      stdio: 'pipe',
      encoding: 'utf8',
    }
  );

  if (result.error || result.status !== 0) {
    return {
      error:
        result.error?.message ||
        result.stderr?.trim() ||
        result.stdout?.trim() ||
        'Auth endpoint is not ready',
      metadata: null,
    };
  }

  try {
    const metadata = JSON.parse(result.stdout);
    if (
      metadata?.authenticated !== false ||
      metadata?.providerId !== 'home_assistant' ||
      !/^nas_[a-f0-9]{32}$/.test(metadata?.sessionId) ||
      Object.hasOwn(metadata, 'access_token') ||
      Object.hasOwn(metadata, 'refresh_token')
    ) {
      return {
        error: `Unexpected auth metadata: ${result.stdout.trim()}`,
        metadata: null,
      };
    }

    return { error: null, metadata };
  } catch {
    return {
      error: `Auth endpoint returned invalid JSON: ${result.stdout.trim()}`,
      metadata: null,
    };
  }
}

async function waitForAuthMetadata(containerName) {
  let lastError = 'Auth endpoint is not ready';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = readAuthMetadata(containerName);
    if (result.metadata) {
      return result.metadata;
    }
    lastError = result.error;
    await delay(250);
  }

  const logs = spawnSync('docker', ['logs', containerName], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const diagnostic = [logs.stdout?.trim(), logs.stderr?.trim()].filter(Boolean).join('\n');
  throw new Error(diagnostic ? `${lastError}\n${diagnostic}` : lastError);
}

const imageTag = `navet-docker-runtime-check:${Date.now()}`;
const containerName = `navet-docker-runtime-check-${process.pid}-${Date.now()}`;

try {
  ensureSerializedProfileRuntime();
  ensureDockerAvailable();
  run('docker', ['build', '--build-arg', 'NAVET_ENABLE_DEMO=false', '-t', imageTag, '.'], {
    cwd: process.cwd(),
  });
  run('docker', [
    'run',
    '--rm',
    '-e',
    'NAVET_HASS_URL=http://homeassistant.local:8123',
    '--tmpfs',
    '/data',
    imageTag,
    'nginx',
    '-t',
  ]);
  run('docker', [
    'run',
    '-d',
    '--name',
    containerName,
    '--tmpfs',
    '/data',
    imageTag,
  ]);

  const firstSession = await waitForAuthMetadata(containerName);
  const secondSession = await waitForAuthMetadata(containerName);
  if (firstSession.sessionId === secondSession.sessionId) {
    throw new Error('Separate cookie-less requests received the same auth session ID');
  }

  console.log(
    `Docker NJS auth smoke check passed with isolated sessions ${firstSession.sessionId} and ${secondSession.sessionId}.`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  spawnSync('docker', ['rm', '-f', containerName], {
    stdio: 'ignore',
  });
  spawnSync('docker', ['image', 'rm', '-f', imageTag], {
    stdio: 'ignore',
  });
}
