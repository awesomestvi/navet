import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

export const RELEASE_FRAGMENT_TYPES = ['new', 'improved', 'fixed', 'security', 'internal'];
export const RELEASE_FRAGMENT_AUDIENCES = ['standalone', 'home-assistant', 'hacs', 'docs'];

function runGit(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function listAddedReleaseFragmentFiles(fromRef, toRef = 'HEAD') {
  if (!fromRef) throw new Error('A base Git ref is required to select release fragments.');

  const output = runGit([
    'diff',
    '--name-only',
    '--diff-filter=A',
    `${fromRef}..${toRef}`,
    '--',
    '.changes/*.yaml',
  ]);

  return output ? output.split('\n').map((file) => file.trim()).filter(Boolean) : [];
}

export function parseReleaseFragment(content, file = 'release fragment') {
  const fragment = {};
  let listField = null;
  for (const rawLine of content.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('- ')) {
      if (listField !== 'audiences') throw new Error(`${file} contains an unexpected list item.`);
      fragment.audiences.push(trimmed.slice(2).trim());
      continue;
    }

    const match = trimmed.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (!match) throw new Error(`${file} contains invalid YAML: ${trimmed}`);
    const [, key, rawValue = ''] = match;
    listField = null;
    if (key === 'audiences') {
      if (!rawValue) {
        fragment.audiences = [];
        listField = key;
      } else if (rawValue === '[]') {
        fragment.audiences = [];
      } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        fragment.audiences = rawValue.slice(1, -1).split(',').map((value) => value.trim()).filter(Boolean);
      } else {
        throw new Error(`${file} audiences must be a YAML list.`);
      }
    } else {
      fragment[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    }
  }

  if (Object.keys(fragment).length === 0) {
    throw new Error(`${file} must contain a YAML object.`);
  }

  const allowedFields = new Set(['type', 'audiences', 'summary']);
  const unknownFields = Object.keys(fragment).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new Error(`${file} contains unsupported fields: ${unknownFields.join(', ')}.`);
  }

  if (!RELEASE_FRAGMENT_TYPES.includes(fragment.type)) {
    throw new Error(`${file} type must be one of: ${RELEASE_FRAGMENT_TYPES.join(', ')}.`);
  }

  if (!Array.isArray(fragment.audiences)) {
    throw new Error(`${file} audiences must be a YAML list.`);
  }

  const audiences = [...new Set(fragment.audiences)];
  const invalidAudiences = audiences.filter(
    (audience) =>
      typeof audience !== 'string' || !RELEASE_FRAGMENT_AUDIENCES.includes(audience)
  );
  if (invalidAudiences.length > 0) {
    throw new Error(
      `${file} audiences must use: ${RELEASE_FRAGMENT_AUDIENCES.join(', ')}.`
    );
  }

  if (fragment.type === 'internal') {
    if (audiences.length > 0) {
      throw new Error(`${file} internal changes must use an empty audiences list.`);
    }
  } else if (audiences.length === 0) {
    throw new Error(`${file} user-facing changes must name at least one audience.`);
  }

  if (typeof fragment.summary !== 'string' || !fragment.summary.trim()) {
    throw new Error(`${file} summary must be a non-empty string.`);
  }

  const summary = fragment.summary.trim().replace(/\s+/g, ' ');
  if (summary !== fragment.summary.trim()) {
    throw new Error(`${file} summary must be a single line with normalized spacing.`);
  }

  const wordCount = summary.split(/\s+/).length;
  if (wordCount > 20) {
    throw new Error(`${file} summary must contain 20 words or fewer; received ${wordCount}.`);
  }

  return { type: fragment.type, audiences, summary, file };
}

export function readReleaseFragments(files) {
  return files.map((file) =>
    parseReleaseFragment(readFileSync(resolve(repoRoot, file), 'utf8'), file)
  );
}

export function renderReleaseNotes(fragments, { audience } = {}) {
  const visible = fragments.filter(
    (fragment) =>
      fragment.type !== 'internal' && (!audience || fragment.audiences.includes(audience))
  );

  if (visible.length === 0) return 'No user-facing changes in this release.\n';

  const sections = [
    {
      heading: 'New features',
      items: visible.filter((fragment) => fragment.type === 'new'),
    },
    {
      heading: 'Improvements and bug fixes',
      items: visible.filter((fragment) => ['improved', 'fixed'].includes(fragment.type)),
    },
    {
      heading: 'Security',
      items: visible.filter((fragment) => fragment.type === 'security'),
    },
  ].filter((section) => section.items.length > 0);

  return `${sections
    .map(
      (section) =>
        `## ${section.heading}\n\n${section.items
          .map((fragment) => `- ${fragment.summary}`)
          .join('\n')}`
    )
    .join('\n\n')}\n`;
}
