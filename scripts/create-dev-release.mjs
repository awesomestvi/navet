import { execFileSync } from 'node:child_process';
import process from 'node:process';
import {
  buildDevAddonVersion,
  fail,
  getPackageVersion,
  readText,
  updateAddonVersion,
  writeText,
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

function listTags() {
  return runGit(['for-each-ref', '--sort=-creatordate', '--format=%(refname:short)', 'refs/tags'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isStableReleaseTag(tag) {
  return /^v\d+\.\d+\.\d+$/.test(tag);
}

function resolveChangelogBaseTag() {
  return listTags().find((tag) => tag.startsWith('navet-dev-') || isStableReleaseTag(tag)) ?? null;
}

function normalizeCommitSubject(subject) {
  const stripped = subject
    .trim()
    .replace(/^(?:feat|fix|perf|refactor|docs|test|build|ci|chore)(?:\([^)]+\))?!?:\s*/i, '')
    .replace(/\s+/g, ' ');

  if (!stripped) {
    return null;
  }

  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function listCommitSubjectsSince(tag) {
  if (!tag) {
    return [];
  }

  return runGit(['log', '--format=%s', '--no-merges', `${tag}..HEAD`])
    .split('\n')
    .map((value) => normalizeCommitSubject(value))
    .filter(Boolean);
}

function listStagedFiles() {
  return runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
}

function listInProgressFiles() {
  const unstagedFiles = runGit(['diff', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  const untrackedFiles = runGit(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...unstagedFiles, ...untrackedFiles])];
}

const CHANGE_AREAS = [
  {
    label: 'Home Assistant shell and kiosk integration',
    match: (file) =>
      file.includes('packages/app/src/infrastructure/home-assistant/runtime/') ||
      file.includes('packages/app/src/panel/') ||
      file.includes('apps/ha-panel/') ||
      file.includes('packages/app/src/hooks/use-home-assistant-panel-shell.ts') ||
      file.includes('packages/app/src/services/home-assistant-panel-adapter.ts') ||
      file === 'docs/HOME_ASSISTANT.md',
  },
  {
    label: 'Navigation and sidebar kiosk controls',
    match: (file) =>
      file.includes('packages/app/src/components/layout/sidebar.tsx') ||
      file.includes('packages/app/src/components/layout/mobile-section-orbit-sheet.tsx') ||
      file.includes('packages/app/src/components/layout/__tests__/sidebar.test.tsx'),
  },
  {
    label: 'Home Assistant shell regression coverage',
    match: (file) =>
      file.includes('packages/app/src/infrastructure/home-assistant/runtime/__tests__/') ||
      file.includes('packages/app/src/hooks/__tests__/use-home-assistant-panel-shell.test.tsx') ||
      file.includes('packages/app/src/stores/__tests__/settings-store.test.ts'),
  },
  {
    label: 'Auth screen polish',
    match: (file) =>
      file.includes('packages/app/src/features/auth/login-page.tsx') ||
      file.includes('packages/app/src/features/auth/homey-selection-page.tsx'),
  },
  {
    label: 'Localization updates',
    match: (file) => file.includes('packages/app/src/i18n/messages/'),
  },
  {
    label: 'Home Assistant panel workflow tooling',
    match: (file) =>
      file.includes('scripts/reset-ha-panel-assets.sh') ||
      file === 'package.json',
  },
  {
    label: 'Dev release tooling',
    match: (file) => file.startsWith('scripts/'),
  },
];

function describeFileAreas(files) {
  const labels = new Set();

  for (const file of files) {
    for (const area of CHANGE_AREAS) {
      if (area.match(file)) {
        labels.add(area.label);
      }
    }
  }

  return [...labels];
}

function formatAreaList(labels) {
  if (labels.length === 0) {
    return null;
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

function replaceInProgressSection(content, lines) {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const nextSection = `## In Progress\n\n${lines.map((line) => `- ${line}`).join('\n')}`;

  if (normalizedContent.includes('## In Progress')) {
    return normalizedContent.replace(
      /## In Progress[\s\S]*?(?=\n## |\s*$)/,
      nextSection
    ).replace(/\n{3,}/g, '\n\n');
  }

  const header = '# Changelog';
  if (normalizedContent.startsWith(`${header}\n`)) {
    const remainder = normalizedContent.slice(header.length).trimStart();
    return `${header}\n\n${nextSection}${remainder ? `\n\n${remainder}` : ''}\n`;
  }

  return `${header}\n\n${nextSection}\n`;
}

function buildInProgressLines(baseTag) {
  const commitSubjects = listCommitSubjectsSince(baseTag);
  const stagedAreas = describeFileAreas(
    listStagedFiles().filter((file) => file !== 'platform/home-assistant/addons/navet-dev/CHANGELOG.md')
  );
  const inProgressAreas = describeFileAreas(
    listInProgressFiles().filter(
      (file) =>
        file !== 'platform/home-assistant/addons/navet-dev/CHANGELOG.md' &&
        file !== 'platform/home-assistant/addons/navet-dev/config.yaml'
    )
  );

  const lines = [];

  if (baseTag) {
    lines.push(`Current Navet Dev scope since \`${baseTag}\`.`);
  } else {
    lines.push('Current Navet Dev scope with no earlier stable or dev release tag available.');
  }

  if (commitSubjects.length > 0) {
    lines.push(...commitSubjects);
  } else if (baseTag) {
    lines.push(`No committed changes have landed after \`${baseTag}\` yet.`);
  } else {
    lines.push('No committed release baseline was found yet.');
  }

  const stagedSummary = formatAreaList(stagedAreas);
  if (stagedSummary) {
    lines.push(`Current staged work includes ${stagedSummary}.`);
  }

  const inProgressSummary = formatAreaList(inProgressAreas);
  if (inProgressSummary) {
    lines.push(`Current in-progress work includes ${inProgressSummary}.`);
  }

  return lines;
}

function updateDevChangelog() {
  const changelogPath = `${homeAssistantPaths.addonNavetDev}/CHANGELOG.md`;
  const content = readText(changelogPath);
  const baseTag = resolveChangelogBaseTag();
  const nextContent = replaceInProgressSection(content, buildInProgressLines(baseTag));

  if (nextContent !== content) {
    writeText(changelogPath, nextContent);
  }
}

function stageMetadataCommit(devVersion) {
  updateAddonVersion(devVersion, `${homeAssistantPaths.addonNavetDev}/config.yaml`);
  updateDevChangelog();
  runGit(['add', 'platform/home-assistant/addons/navet-dev/config.yaml']);
  runGit(['add', 'platform/home-assistant/addons/navet-dev/CHANGELOG.md']);

  if (
    gitSucceeds([
      'diff',
      '--cached',
      '--quiet',
      '--',
      'platform/home-assistant/addons/navet-dev/config.yaml',
      'platform/home-assistant/addons/navet-dev/CHANGELOG.md',
    ])
  ) {
    throw new Error(
      `Expected Navet Dev metadata to change for ${devVersion}, but no staged diff was created.`
    );
  }

  runGit(
    [
      'commit',
      '-m',
      `chore(release): publish navet dev ${devVersion}`,
      '--',
      'platform/home-assistant/addons/navet-dev/config.yaml',
      'platform/home-assistant/addons/navet-dev/CHANGELOG.md',
    ],
    {
    stdio: 'inherit',
    }
  );
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
