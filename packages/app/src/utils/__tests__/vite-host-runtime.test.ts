import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createBuildMetadata } from '@scripts/vite-host-conventions';
import { loadConfigFromFile } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vitest';

const repoRoot = process.cwd();

afterEach(() => vi.unstubAllEnvs());

describe('Vite host runtime composition', () => {
  it('preserves distinct Git and environment metadata fallbacks', () => {
    vi.stubEnv('NAVET_GIT_SHA', undefined);
    vi.stubEnv('NAVET_BUILD_DATE', undefined);
    vi.stubEnv('NAVET_BUILD_VERSION', undefined);
    vi.stubEnv('GITHUB_SHA', 'ci-sha');
    vi.stubEnv('SOURCE_DATE_EPOCH', '0');
    const git = createBuildMetadata(repoRoot, '1.2.3', 'git');
    expect(git.gitSha).toBe(
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    );
    expect(git.buildDate).toBe('1970-01-01T00:00:00.000Z');
    expect(git.buildVersion).toBe('1.2.3');
    expect(createBuildMetadata(repoRoot, '1.2.3', 'environment').gitSha).toBe('ci-sha');
  });

  it('gives explicit build metadata precedence in both host policies', () => {
    vi.stubEnv('NAVET_GIT_SHA', ' explicit-sha ');
    vi.stubEnv('NAVET_BUILD_DATE', ' explicit-date ');
    vi.stubEnv('NAVET_BUILD_VERSION', ' explicit-version ');
    vi.stubEnv('NAVET_RELEASE_CHANNEL', ' stable ');
    for (const policy of ['git', 'environment'] as const) {
      expect(createBuildMetadata(repoRoot, '1.2.3', policy)).toEqual({
        gitSha: 'explicit-sha',
        buildDate: 'explicit-date',
        buildVersion: 'explicit-version',
        releaseChannel: 'stable',
      });
    }
  });

  it.each(['standalone', 'demo', 'website', 'ha-panel', 'storybook'])(
    'loads the %s host with package aliases and its runtime configuration',
    async (host) => {
      const loaded = await loadConfigFromFile(
        { command: 'build', mode: 'test' },
        path.join(repoRoot, 'apps', host, 'vite.config.ts')
      );
      expect(loaded).not.toBeNull();
      if (!loaded) throw new Error('Expected host config to load');
      const config = loaded.config;
      expect(config.resolve?.alias).toMatchObject({
        '@navet/core': path.join(repoRoot, 'packages/core/src'),
        '@navet/provider-homeassistant': path.join(repoRoot, 'packages/provider-homeassistant/src'),
        '@navet/provider-homey': path.join(repoRoot, 'packages/provider-homey/src'),
        '@navet/provider-openhab': path.join(repoRoot, 'packages/provider-openhab/src'),
      });
      if (host === 'standalone') {
        const plugins = (await Promise.all((config.plugins ?? []) as unknown[])).flat(
          Infinity
        ) as Array<{
          name?: string;
        }>;
        expect(plugins.map((plugin) => plugin?.name)).toEqual(
          expect.arrayContaining(['navet-rss-proxy', 'navet-homey-proxy', 'navet-openhab-proxy'])
        );
        expect(config.base).toBe('./');
      }
      if (host === 'ha-panel') {
        expect(config.base).toBe('/api/navet/static/');
        expect(config.publicDir).toBe(false);
      }
      if (host === 'demo' || host === 'website') expect(config.base).toBe('/');
    }
  );
});
