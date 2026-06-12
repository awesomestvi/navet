import { execFileSync } from 'node:child_process';
import process from 'node:process';
import {
  addonDevConfigPath,
  buildDevAddonVersion,
  fail,
  getPackageVersion,
  readAddonVersion,
  updateAddonVersion,
} from './release-surfaces.mjs';
import { repoRoot } from './repo-paths.mjs';

const DEV_CONFIG_REPO_PATH = 'platform/home-assistant/addons/navet-dev/config.yaml';
const DEFAULT_COMMIT_MESSAGE = 'chore(release): refresh navet dev version';

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function gitSucceeds(args) {
  try {
    execFileSync('git', args, {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const options = {
    push: false,
    remote: 'origin',
    commitMessage: DEFAULT_COMMIT_MESSAGE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--push') {
      options.push = true;
      continue;
    }

    if (arg === '--remote') {
      const value = argv[index + 1]?.trim();
      if (!value) {
        throw new Error('Missing value for --remote.');
      }
      options.remote = value;
      index += 1;
      continue;
    }

    if (arg === '--message') {
      const value = argv[index + 1];
      if (!value?.trim()) {
        throw new Error('Missing value for --message.');
      }
      options.commitMessage = value.trim();
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function ensureNoUnrelatedStagedChanges() {
  const stagedFiles = runGit(['diff', '--cached', '--name-only'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  const unrelatedStagedFiles = stagedFiles.filter((filePath) => filePath !== DEV_CONFIG_REPO_PATH);
  if (unrelatedStagedFiles.length > 0) {
    throw new Error(
      `Refusing to create a dev release with unrelated staged changes: ${unrelatedStagedFiles.join(', ')}`
    );
  }
}

function ensureMainBranchForPush() {
  const currentBranch = runGit(['branch', '--show-current']);
  if (currentBranch !== 'main') {
    throw new Error(
      `--push requires the current branch to be main. Current branch: ${currentBranch || '(detached HEAD)'}`
    );
  }
}

function createCommitIfNeeded(commitMessage) {
  runGit(['add', DEV_CONFIG_REPO_PATH]);

  if (gitSucceeds(['diff', '--cached', '--quiet', '--', DEV_CONFIG_REPO_PATH])) {
    return false;
  }

  execFileSync('git', ['commit', '-m', commitMessage, '--', DEV_CONFIG_REPO_PATH], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  return true;
}

function createTag(tagName) {
  if (gitSucceeds(['rev-parse', '-q', '--verify', `refs/tags/${tagName}`])) {
    throw new Error(`Tag already exists: ${tagName}`);
  }

  runGit(['tag', '-a', tagName, '-m', `Navet Dev ${tagName}`]);
}

function pushRelease(remote, tagName) {
  execFileSync('git', ['push', remote, 'main'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  execFileSync('git', ['push', remote, tagName], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

try {
  const options = parseArgs(process.argv.slice(2));

  ensureNoUnrelatedStagedChanges();
  if (options.push) {
    ensureMainBranchForPush();
  }

  const packageVersion = getPackageVersion();
  const nextDevVersion = buildDevAddonVersion(packageVersion);
  updateAddonVersion(nextDevVersion, addonDevConfigPath);

  const committedDevVersion = readAddonVersion(addonDevConfigPath);
  const tagName = `navet-dev-${committedDevVersion}`;
  const createdCommit = createCommitIfNeeded(options.commitMessage);

  createTag(tagName);

  if (options.push) {
    pushRelease(options.remote, tagName);
  }

  process.stdout.write(
    [
      `Prepared Navet Dev release ${committedDevVersion}.`,
      createdCommit
        ? `Created commit with message: ${options.commitMessage}`
        : 'No new commit was needed; reused the current HEAD.',
      `Created tag: ${tagName}`,
      options.push
        ? `Pushed main and ${tagName} to ${options.remote}.`
        : `Next: git push ${options.remote} main && git push ${options.remote} ${tagName}`,
    ].join('\n') + '\n'
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
