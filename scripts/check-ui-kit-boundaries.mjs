#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { applyCompositionBaseline, findCompositionViolations } from './ui-shell-recipes.mjs';
import { findUiFeatureImports } from './ui-feature-imports.mjs';

const ROOT = process.cwd();

const SHARED_DIRS = [
  'packages/ui/src',
  'packages/app/src/components/primitives',
  'packages/app/src/components/patterns',
  'packages/app/src/components/shared',
  'packages/app/src/components/system',
  'packages/app/src/ui-kit',
];

function walk(dir) {
  const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(relativePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

const violations = [];

for (const dir of SHARED_DIRS) {
  for (const relativePath of walk(dir)) {
    if (relativePath.includes('.stories.')) continue;
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    for (const specifier of findUiFeatureImports(relativePath, source)) {
      violations.push(`${relativePath}: shared UI layers must not depend on feature modules (${specifier})`);
    }
  }
}

// Canonical Radix shell implementations own their shell classes. Consumers and stories are checked.
const canonicalShells = new Set(['packages/app/src/components/primitives/dialog-primitives.tsx', 'packages/app/src/components/ui/alert-dialog.tsx', 'packages/app/src/components/ui/dialog.tsx', 'packages/app/src/components/primitives/modal-surface.tsx', 'packages/app/src/components/primitives/Cards/BaseCardDialog/index.tsx']);
const shellFiles = walk('packages/app/src').filter((file) => !canonicalShells.has(file));
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ui-composition-baseline.json'), 'utf8'));
const result = applyCompositionBaseline(findCompositionViolations(ROOT, shellFiles), baseline);
for (const entry of result.newViolations) violations.push(`${entry.file}:${entry.line}: ${entry.rule} (${entry.anchor}, occurrence ${entry.occurrence})`);
for (const entry of result.obsolete) violations.push(`${entry.file}: obsolete baseline entry ${entry.rule} (${entry.anchor})`);

if (violations.length > 0) {
  console.error('\nUI kit boundary check failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('UI kit boundary check passed.');
