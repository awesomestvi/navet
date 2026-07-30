import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const sourceScriptsDirectory = dirname(fileURLToPath(import.meta.url));
const temporaryDirectories = [];

function runGit(repository, environment, args) {
  return execFileSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readRemoteRef(fixture, ref) {
  return runGit(fixture.remote, fixture.environment, ['rev-parse', ref]);
}

function createReleaseFixture() {
  const root = mkdtempSync(join(tmpdir(), 'navet-dev-release-'));
  const repository = join(root, 'repository');
  const remote = join(root, 'remote.git');
  const emptyHooksDirectory = join(root, 'empty-hooks');
  const globalGitConfig = join(root, 'global.gitconfig');
  const environment = {
    ...process.env,
    GIT_AUTHOR_EMAIL: 'navet-release-test@example.com',
    GIT_AUTHOR_NAME: 'Navet Release Test',
    GIT_COMMITTER_EMAIL: 'navet-release-test@example.com',
    GIT_COMMITTER_NAME: 'Navet Release Test',
    GIT_CONFIG_GLOBAL: globalGitConfig,
    GIT_CONFIG_NOSYSTEM: '1',
  };

  temporaryDirectories.push(root);
  mkdirSync(repository, { recursive: true });
  mkdirSync(remote, { recursive: true });
  mkdirSync(emptyHooksDirectory, { recursive: true });
  writeFileSync(globalGitConfig, '', 'utf8');

  runGit(repository, environment, ['init', '--initial-branch=main']);
  runGit(remote, environment, ['init', '--bare', '--initial-branch=main']);
  runGit(repository, environment, ['config', 'core.hooksPath', emptyHooksDirectory]);
  runGit(repository, environment, ['config', 'commit.gpgSign', 'false']);
  runGit(repository, environment, ['config', 'tag.gpgSign', 'false']);

  cpSync(sourceScriptsDirectory, join(repository, 'scripts'), { recursive: true });
  mkdirSync(join(repository, 'platform/home-assistant/addons/navet-dev'), {
    recursive: true,
  });
  writeFileSync(
    join(repository, 'package.json'),
    `${JSON.stringify(
      {
        name: 'navet-release-fixture',
        private: true,
        type: 'module',
        version: '0.11.1',
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    join(repository, 'repository.yaml'),
    [
      'name: Navet Add-ons',
      'url: https://github.com/awesomestvi/navet',
      'maintainer: Navet Release Test',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    join(repository, 'platform/home-assistant/addons/navet-dev/config.yaml'),
    [
      'name: Navet Dev',
      'version: "0.11.1-dev.20260701000000"',
      'slug: navet_dev',
      'description: Development build of Navet',
      'image: ghcr.io/awesomestvi/{arch}-navet-addon',
      'arch:',
      '  - aarch64',
      '  - amd64',
      '',
    ].join('\n'),
    'utf8'
  );
  writeFileSync(
    join(repository, 'platform/home-assistant/addons/navet-dev/CHANGELOG.md'),
    ['# Changelog', '', '## In Progress', '', '- Previous development scope.', ''].join('\n'),
    'utf8'
  );

  runGit(repository, environment, ['add', '.']);
  runGit(repository, environment, ['commit', '-m', 'chore: establish release fixture']);
  runGit(repository, environment, ['tag', '-a', 'v0.11.1', '-m', 'Navet v0.11.1']);
  runGit(repository, environment, ['remote', 'add', 'origin', remote]);
  runGit(repository, environment, ['push', '--set-upstream', 'origin', 'main']);
  runGit(repository, environment, ['push', 'origin', 'refs/tags/v0.11.1']);

  return {
    environment,
    remote,
    repository,
  };
}

function commitProductChange(fixture, branch = null) {
  if (branch) {
    runGit(fixture.repository, fixture.environment, ['switch', '-c', branch]);
  }

  writeFileSync(
    join(fixture.repository, 'product-change.txt'),
    'Low-power dashboard rendering is ready for a development release.\n',
    'utf8'
  );
  runGit(fixture.repository, fixture.environment, ['add', 'product-change.txt']);
  runGit(fixture.repository, fixture.environment, [
    'commit',
    '-m',
    'perf(dashboard): improve low-power rendering',
  ]);
}

function runPublisher(fixture) {
  return spawnSync('node', ['scripts/create-dev-release.mjs', '--push'], {
    cwd: fixture.repository,
    encoding: 'utf8',
    env: fixture.environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readPublishedVersion(fixture) {
  const config = readFileSync(
    join(fixture.repository, 'platform/home-assistant/addons/navet-dev/config.yaml'),
    'utf8'
  );
  const match = config.match(/^version:\s*"([^"]+)"$/m);

  expect(match?.[1]).toMatch(/^0\.11\.1-dev\.\d{14}$/);
  return match[1];
}

function expectMetadataRelease(fixture, result, branch) {
  expect(result.status, result.stderr || result.stdout).toBe(0);

  const version = readPublishedVersion(fixture);
  const tag = `navet-dev-${version}`;
  const branchHead = readRemoteRef(fixture, `refs/heads/${branch}`);
  const tagTarget = readRemoteRef(fixture, `refs/tags/${tag}^{}`);

  expect(tagTarget).toBe(branchHead);
  expect(runGit(fixture.remote, fixture.environment, ['cat-file', '-t', `refs/tags/${tag}`])).toBe(
    'tag'
  );
  expect(
    runGit(fixture.repository, fixture.environment, ['log', '-1', '--format=%s'])
  ).toBe(`chore(release): publish navet dev ${version}`);
  expect(
    runGit(fixture.repository, fixture.environment, [
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      'HEAD',
    ])
      .split('\n')
      .filter(Boolean)
      .sort()
  ).toEqual([
    'platform/home-assistant/addons/navet-dev/CHANGELOG.md',
    'platform/home-assistant/addons/navet-dev/config.yaml',
  ]);
  expect(
    runGit(fixture.remote, fixture.environment, [
      'for-each-ref',
      '--format=%(contents)',
      `refs/tags/${tag}`,
    ])
  ).toContain(`Navet Dev ${tag}\n\nSource-Branch: ${branch}`);
  expect(
    readFileSync(
      join(fixture.repository, 'platform/home-assistant/addons/navet-dev/CHANGELOG.md'),
      'utf8'
    )
  ).toContain('Improve low-power rendering');

  return {
    branchHead,
    tag,
    version,
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('create-dev-release', () => {
  it('publishes a non-main branch and tag without advancing main', () => {
    const fixture = createReleaseFixture();
    const mainBefore = readRemoteRef(fixture, 'refs/heads/main');

    commitProductChange(fixture, 'feature/performance');
    const result = runPublisher(fixture);
    const release = expectMetadataRelease(fixture, result, 'feature/performance');

    expect(readRemoteRef(fixture, 'refs/heads/main')).toBe(mainBefore);
    expect(release.branchHead).not.toBe(mainBefore);
    expect(result.stdout).toContain(
      `docker pull ghcr.io/awesomestvi/navet:${release.version}`
    );
  });

  it('publishes main and the matching tag together', () => {
    const fixture = createReleaseFixture();
    const mainBefore = readRemoteRef(fixture, 'refs/heads/main');

    commitProductChange(fixture);
    const result = runPublisher(fixture);
    const release = expectMetadataRelease(fixture, result, 'main');

    expect(release.branchHead).not.toBe(mainBefore);
    expect(readRemoteRef(fixture, `refs/tags/${release.tag}^{}`)).toBe(release.branchHead);
  });

  it('rejects a dirty worktree without creating a commit or tag', () => {
    const fixture = createReleaseFixture();

    commitProductChange(fixture, 'feature/performance');
    const headBefore = runGit(fixture.repository, fixture.environment, ['rev-parse', 'HEAD']);
    writeFileSync(
      join(fixture.repository, 'product-change.txt'),
      'This uncommitted change must not enter the release.\n',
      'utf8'
    );

    const result = runPublisher(fixture);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/clean|dirty|uncommitted/i);
    expect(runGit(fixture.repository, fixture.environment, ['rev-parse', 'HEAD'])).toBe(headBefore);
    expect(
      runGit(fixture.remote, fixture.environment, ['tag', '--list', 'navet-dev-*'])
    ).toBe('');
  });

  it('rejects detached HEAD without creating a commit or tag', () => {
    const fixture = createReleaseFixture();

    commitProductChange(fixture, 'feature/performance');
    const headBefore = runGit(fixture.repository, fixture.environment, ['rev-parse', 'HEAD']);
    runGit(fixture.repository, fixture.environment, ['switch', '--detach']);

    const result = runPublisher(fixture);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/detached|named branch/i);
    expect(runGit(fixture.repository, fixture.environment, ['rev-parse', 'HEAD'])).toBe(headBefore);
    expect(
      runGit(fixture.remote, fixture.environment, ['tag', '--list', 'navet-dev-*'])
    ).toBe('');
  });

  it('rejects a branch that does not contain the latest remote main', () => {
    const fixture = createReleaseFixture();

    commitProductChange(fixture, 'feature/performance');
    const featureHead = runGit(fixture.repository, fixture.environment, ['rev-parse', 'HEAD']);
    runGit(fixture.repository, fixture.environment, ['switch', 'main']);
    writeFileSync(
      join(fixture.repository, 'main-change.txt'),
      'Main advanced after the feature branch was created.\n',
      'utf8'
    );
    runGit(fixture.repository, fixture.environment, ['add', 'main-change.txt']);
    runGit(fixture.repository, fixture.environment, [
      'commit',
      '-m',
      'fix: advance remote main',
    ]);
    runGit(fixture.repository, fixture.environment, ['push', 'origin', 'main']);
    runGit(fixture.repository, fixture.environment, ['switch', 'feature/performance']);

    const result = runPublisher(fixture);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'must contain the latest origin/main'
    );
    expect(runGit(fixture.repository, fixture.environment, ['rev-parse', 'HEAD'])).toBe(
      featureHead
    );
    expect(
      runGit(fixture.remote, fixture.environment, ['tag', '--list', 'navet-dev-*'])
    ).toBe('');
  });
});
