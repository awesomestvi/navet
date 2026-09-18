#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-paths.mjs';

const composeFile = resolve(repoRoot, 'compose.private-preview.yml');
const envFile = resolve(
  repoRoot,
  process.env.NAVET_PRIVATE_PREVIEW_ENV_FILE ?? '.env.private-preview'
);
const composeArgs = ['compose', '--env-file', envFile, '-f', composeFile];

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

export function verifyPrivatePreviewSource({ configuredSha, headSha, worktreeStatus }) {
  if (worktreeStatus.trim()) {
    throw new Error(
      `Private preview source must be clean. Commit or remove these changes first:\n${worktreeStatus.trim()}`
    );
  }
  if (configuredSha !== headSha) {
    throw new Error(
      `NAVET_PREVIEW_GIT_SHA (${configuredSha || 'missing'}) does not match checked-out HEAD (${headSha}).`
    );
  }
}

function main() {
  const headSha = capture('git', ['rev-parse', 'HEAD']);
  const worktreeStatus = capture('git', ['status', '--porcelain=v1', '--untracked-files=all']);
  const configuration = JSON.parse(
    capture('docker', [...composeArgs, 'config', '--format', 'json'])
  );
  const configuredSha =
    configuration.services?.['navet-private-preview']?.build?.args?.NAVET_GIT_SHA;

  verifyPrivatePreviewSource({ configuredSha, headSha, worktreeStatus });
  process.stdout.write(`Verified clean private-preview source at ${headSha}.\n`);

  if (process.argv.includes('--verify-only')) return;

  const result = spawnSync('docker', [...composeArgs, 'up', '--build', '-d'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
