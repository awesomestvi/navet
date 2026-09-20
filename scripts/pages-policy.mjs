// Cloudflare wildcard '*' includes path separators. Unknown inputs remain watched.
// Keep this conservative: a redundant build is safer than silently stale production.
const automationOnly = [
  '.changes/*',
  '.github/*',
  '.agents/*',
  '.codex/*',
  '.husky/*',
  'AGENTS.md',
  '*/AGENTS.md',
  'scripts/pipeline-*',
  'scripts/pages-*',
  'scripts/release-*',
  'scripts/dev-tag-*',
  'scripts/create-dev-release*',
  'scripts/prepare-addon-release*',
  'scripts/generate-release-notes*',
  'scripts/check-release-fragments*',
  'scripts/export-hacs*',
  'scripts/hacs-changelog*',
  'platform/home-assistant/addons/navet/config.yaml',
  'platform/home-assistant/addons/navet-dev/config.yaml',
  'platform/home-assistant/addons/navet/CHANGELOG.md',
  'platform/home-assistant/addons/navet-dev/CHANGELOG.md',
];
const documentation = ['docs/*', 'ai/*', 'apps/docs/*', 'README.md', 'CONTRIBUTING.md'];
const marketing = ['apps/website/*', 'packages/app/src/marketing/*'];
const stories = [
  'apps/storybook/*',
  '*.stories.ts',
  '*.stories.tsx',
  '*.stories.js',
  '*.stories.jsx',
];

export const pagesProjects = {
  website: { name: 'navet', excludes: [...documentation, 'apps/demo/*', ...stories] },
  docs: { name: 'navet-docs', excludes: [...marketing, 'apps/demo/*', ...stories] },
  demo: {
    name: 'navet-demo',
    excludes: [...documentation, ...marketing, ...stories, 'CHANGELOG.md'],
  },
  storybook: {
    name: 'navet-storybook',
    excludes: [...documentation, ...marketing, 'apps/demo/*', 'CHANGELOG.md'],
  },
};

export function pagesBuildConfig(surface) {
  const project = pagesProjects[surface];
  if (!project) throw new Error(`Unknown Pages surface: ${surface}`);
  return { path_includes: ['*'], path_excludes: [...automationOnly, ...project.excludes] };
}

export function pagesAffected(files) {
  const matches = (pattern, file) =>
    new RegExp(
      `^${pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`,
    ).test(file);
  return Object.fromEntries(
    Object.keys(pagesProjects).map((surface) => [
      surface,
      files.length === 0 ||
        files.some(
          (file) =>
            !pagesBuildConfig(surface).path_excludes.some((pattern) => matches(pattern, file)),
        ),
    ]),
  );
}
