import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
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
  console.error(`check:docker requires a running Docker daemon.\n${message.trim()}`);
  process.exit(1);
}

const imageTag = `navet-docker-runtime-check:${Date.now()}`;
const tempDataDir = mkdtempSync(join(tmpdir(), 'navet-docker-runtime-check-'));

try {
  ensureDockerAvailable();
  run('docker', ['build', '--build-arg', 'NAVET_ENABLE_DEMO=false', '-t', imageTag, '.'], {
    cwd: process.cwd(),
  });
  run('docker', [
    'run',
    '--rm',
    '-e',
    'NAVET_HASS_URL=http://homeassistant.local:8123',
    '-v',
    `${tempDataDir}:/data`,
    imageTag,
    'nginx',
    '-t',
  ]);
} finally {
  spawnSync('docker', ['image', 'rm', '-f', imageTag], {
    stdio: 'ignore',
  });
  rmSync(tempDataDir, { recursive: true, force: true });
}
