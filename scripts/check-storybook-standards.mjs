#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const STORIES_ROOT = path.join(ROOT_DIR, 'src', 'app');

const ALLOWED_TOP_LEVEL_GROUPS = new Set([
  'System',
  'Tokens',
  'Primitives',
  'Patterns',
  'UI',
  'Components',
  'App Shell',
  'Cards',
  'Entity Cards',
  'Custom Cards',
  'Dashboard',
  'Energy',
  'Settings',
  'Settings Dialogs',
]);

/**
 * Startup-style convention:
 * - deterministic top-level groups
 * - hierarchical titles (Section/Subsection/Story)
 * - no ad-hoc one-off roots
 */
function getTopLevelGroup(title) {
  return title.split('/')[0]?.trim() ?? '';
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.stories.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractMetaTitle(source) {
  const metaBlockMatch = source.match(/const\s+meta\s*=\s*\{([\s\S]*?)\}\s*satisfies\s+Meta/);
  if (!metaBlockMatch) {
    return null;
  }

  const metaBlock = metaBlockMatch[1];
  const titleMatch = metaBlock.match(/\btitle\s*:\s*'([^']+)'/);
  return titleMatch ? titleMatch[1].trim() : null;
}

const storyFiles = walk(STORIES_ROOT);
const violations = [];

for (const filePath of storyFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  const title = extractMetaTitle(source);

  if (!title) {
    violations.push({
      filePath,
      reason: 'missing meta title',
    });
    continue;
  }

  const topLevelGroup = getTopLevelGroup(title);
  if (!ALLOWED_TOP_LEVEL_GROUPS.has(topLevelGroup)) {
    violations.push({
      filePath,
      reason: `unknown top-level group "${topLevelGroup}" in title "${title}"`,
    });
  }

  if (!title.includes('/')) {
    violations.push({
      filePath,
      reason: `title should be hierarchical (found "${title}")`,
    });
  }
}

if (violations.length > 0) {
  console.error('\nStorybook standards check failed:\n');
  for (const violation of violations) {
    const relativePath = path.relative(ROOT_DIR, violation.filePath);
    console.error(`- ${relativePath}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log(`Storybook standards check passed for ${storyFiles.length} story files.`);
