import { execSync } from 'node:child_process';
import path from 'node:path';

function resolveFallbackGitSha(repoRoot: string) {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'local';
  }
}

function resolveFallbackBuildDate(repoRoot: string) {
  const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH?.trim();

  if (sourceDateEpoch) {
    const epochMs = Number.parseInt(sourceDateEpoch, 10) * 1000;
    if (Number.isFinite(epochMs)) {
      return new Date(epochMs).toISOString();
    }
  }

  try {
    return execSync('git log -1 --format=%cI', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return new Date(0).toISOString();
  }
}

/** Host-specific fallback policy stays explicit; panel artifacts use reproducible Git dates. */
export function createBuildMetadata(
  repoRoot: string,
  version: string | undefined,
  fallback: 'git' | 'environment'
) {
  return {
    gitSha: (
      process.env.NAVET_GIT_SHA ??
      (fallback === 'git' ? resolveFallbackGitSha(repoRoot) : (process.env.GITHUB_SHA ?? 'local'))
    ).trim(),
    buildDate: (
      process.env.NAVET_BUILD_DATE ??
      (fallback === 'git' ? resolveFallbackBuildDate(repoRoot) : new Date().toISOString())
    ).trim(),
    releaseChannel: (process.env.NAVET_RELEASE_CHANNEL ?? 'development').trim(),
    buildVersion: (process.env.NAVET_BUILD_VERSION ?? version ?? '0.0.0').trim(),
  };
}

export function createNavetPackageAliases(repoRoot: string) {
  return Object.fromEntries(
    ['core', 'ui', 'app', 'provider-homeassistant', 'provider-homey', 'provider-openhab'].map(
      (name) => [`@navet/${name}`, path.resolve(repoRoot, `packages/${name}/src`)]
    )
  );
}

export const REACT_COMPILER_EXCLUDE = [
  /[\\/]node_modules[\\/]/,
  /[\\/]\.cache[\\/]vite[^\\/]*[\\/]deps[\\/]/,
];
