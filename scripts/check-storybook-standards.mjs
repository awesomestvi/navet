#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const STORIES_ROOT = path.join(ROOT_DIR, 'src', 'app');
const PRIMITIVES_DIR = path.join(STORIES_ROOT, 'components', 'primitives');
const PATTERNS_DIR = path.join(STORIES_ROOT, 'components', 'patterns');

const ALLOWED_TOP_LEVEL_GROUPS = new Set([
  'Concepts',
  'Theme',
  'Components',
  'App Shell',
  'Cards',
  'Pages',
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

function walkComponentFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) {
      continue;
    }

    if (entry.name === 'index.ts' || entry.name.endsWith('.stories.tsx')) {
      continue;
    }

    files.push(path.join(dir, entry.name));
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

function getExpectedComponentGroup(filePath) {
  if (filePath.startsWith(PRIMITIVES_DIR)) {
    return 'Components/Primitives/';
  }

  if (filePath.startsWith(PATTERNS_DIR)) {
    return 'Components/Patterns/';
  }

  return null;
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

  const expectedGroup = getExpectedComponentGroup(filePath);
  if (expectedGroup && !title.startsWith(expectedGroup)) {
    violations.push({
      filePath,
      reason: `stories in ${path.relative(ROOT_DIR, path.dirname(filePath))} must use titles under "${expectedGroup}" (found "${title}")`,
    });
  }

  if (filePath.startsWith(PRIMITIVES_DIR)) {
    if (source.includes(`@/app/components/system/primitives`)) {
      violations.push({
        filePath,
        reason:
          'co-located primitive stories should import local source files directly, not the system primitive facade',
      });
    }
  }

  if (filePath.startsWith(PATTERNS_DIR)) {
    if (source.includes(`@/app/components/system/patterns`)) {
      violations.push({
        filePath,
        reason:
          'co-located pattern stories should import local source files directly, not the system pattern facade',
      });
    }
  }
}

for (const directory of [PRIMITIVES_DIR, PATTERNS_DIR]) {
  for (const componentFile of walkComponentFiles(directory)) {
    const storyPath = componentFile.replace(/\.(ts|tsx)$/, '.stories.tsx');

    if (!fs.existsSync(storyPath)) {
      violations.push({
        filePath: componentFile,
        reason: `missing co-located story file "${path.basename(storyPath)}"`,
      });
    }
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
