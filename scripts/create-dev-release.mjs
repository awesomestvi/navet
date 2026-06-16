import { execFileSync } from 'node:child_process';
import process from 'node:process';
import {
  buildDevAddonVersion,
  fail,
  getPackageVersion,
  updateAddonVersion,
} from './release-surfaces.mjs';
import { homeAssistantPaths, repoRoot } from './repo-paths.mjs';

function runGit(args, options = {}) {
  const result = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  return typeof result === 'string' ? result.trim() : '';
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function ensureNoUnrelatedStagedChanges() {
  const stagedFiles = runGit(['diff', '--cached', '--name-only'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  if (stagedFiles.length > 0) {
    throw new Error(
      `Refusing to create a dev release with staged changes: ${stagedFiles.join(', ')}`
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

function ensureMainBranch() {
  const currentBranch = runGit(['branch', '--show-current']);
  if (currentBranch !== 'main') {
    throw new Error(
      `Navet Dev publish must run from the main branch. Current branch: ${currentBranch || '(detached HEAD)'}`
    );
  }
}

function stageMetadataCommit(devVersion) {
  updateAddonVersion(devVersion, `${homeAssistantPaths.addonNavetDev}/config.yaml`);
  runGit(['add', 'platform/home-assistant/addons/navet-dev/config.yaml']);

  if (gitSucceeds(['diff', '--cached', '--quiet', '--', 'platform/home-assistant/addons/navet-dev/config.yaml'])) {
    throw new Error(
      `Expected Navet Dev metadata to change for ${devVersion}, but no staged diff was created.`
    );
  }

  runGit(['commit', '-m', `chore(release): publish navet dev ${devVersion}`], {
    stdio: 'inherit',
  });
}

function createTag(tagName) {
  if (gitSucceeds(['rev-parse', '-q', '--verify', `refs/tags/${tagName}`])) {
    throw new Error(`Tag already exists: ${tagName}`);
  }

  runGit(['tag', '-a', tagName, '-m', `Navet Dev ${tagName}`]);
}

function pushRelease(remote, tagName) {
  execFileSync('git', ['push', remote, 'HEAD:main'], {
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
  ensureMainBranch();
  if (options.push) {
    ensureMainBranchForPush();
  }

  const packageVersion = getPackageVersion();
  const devVersion = buildDevAddonVersion(packageVersion);
  const tagName = `navet-dev-${devVersion}`;

  stageMetadataCommit(devVersion);
  createTag(tagName);

  if (options.push) {
    pushRelease(options.remote, tagName);
  }

  process.stdout.write(
    [
      `Prepared Navet Dev release ${devVersion}.`,
      `Created metadata commit on main for Home Assistant add-on discovery.`,
      `Created tag: ${tagName}`,
      options.push
        ? `Pushed metadata commit and ${tagName} to ${options.remote}.`
        : `Next: git push ${options.remote} HEAD:main && git push ${options.remote} ${tagName}`,
    ].join('\n') + '\n'
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
