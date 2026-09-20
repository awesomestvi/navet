import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { pagesAffected } from './pages-policy.mjs';

// Fail closed: unrecognised files affect every surface. This is deliberately separate
// from descriptive PR labels, which are not a security or validation boundary.
export function pipelineImpact(files, readRevision = () => null) {
  let runtime = files.length === 0;
  for (const file of files) {
    if (/(^|\/)AGENTS\.md$/.test(file)) continue;
    if (/^\.changes\/[^/]+\.ya?ml$/.test(file)) continue;
    if (/^platform\/home-assistant\/addons\/navet(?:-dev)?\/CHANGELOG\.md$/.test(file)) continue;
    if (/^platform\/home-assistant\/addons\/navet(?:-dev)?\/config\.yaml$/.test(file)) {
      const before = readRevision('base', file);
      const after = readRevision('head', file);
      const withoutVersion = (text) => text.replace(/^version:.*\r?\n/gm, '');
      if (
        before &&
        after &&
        /^version: "\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?"$/m.test(after) &&
        withoutVersion(before) === withoutVersion(after)
      )
        continue;
      runtime = true;
      continue;
    }
    if (
      /\.stories\.[jt]sx?$/.test(file) ||
      /^(README|CONTRIBUTING|CHANGELOG)\.md$/.test(file) ||
      /^(docs|ai|apps\/(docs|website|storybook|demo))\//.test(file) ||
      /^packages\/app\/src\/marketing\//.test(file) ||
      /^(\.github|\.agents|\.codex|\.husky)\//.test(file) ||
      /^scripts\/(?:pipeline-|pages-|release-|dev-tag-|create-dev-release|prepare-addon-release|generate-release-notes|check-release-fragments|export-hacs|hacs-changelog)/.test(
        file,
      )
    ) {
      // Quality/script tests and the affected site lanes cover non-runtime inputs.
    } else {
      runtime = true;
    }
  }
  return { runtime, ...pagesAffected(files) };
}

export function readImpact(base, head) {
  if (!/^[a-f0-9]{40}$/.test(base ?? '') || !/^[a-f0-9]{40}$/.test(head ?? '')) {
    throw new Error('Impact analysis requires exact base and head commit SHAs.');
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
  // No rename detection: both old and new paths must affect classification.
  const files = git('diff', '--no-renames', '--name-only', '-z', base, head)
    .split('\0')
    .filter(Boolean);
  return pipelineImpact(files, (revision, file) => {
    try {
      return git('show', `${revision === 'base' ? base : head}:${file}`);
    } catch {
      return null;
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = readImpact(process.env.BASE_SHA, process.env.HEAD_SHA);
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(result)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  }
}
