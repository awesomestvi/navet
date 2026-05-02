#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'src/app');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name) || entry.name.includes('.stories.')) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const metrics = [];
const featureLeakFiles = [];

for (const fullPath of walk(APP_DIR)) {
  const relativePath = path.relative(ROOT, fullPath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const themeBranches = (source.match(/theme === '(light|glass|black|dark)'/g) ?? []).length;
  const inlineStyles = (source.match(/style=\{\{/g) ?? []).length;
  const arbitrarySurfaces =
    (source.match(/rounded-\[[^\]]+\]/g) ?? []).length +
    (source.match(/shadow-\[[^\]]+\]/g) ?? []).length +
    (source.match(/bg-\[[^\]]+\]/g) ?? []).length +
    (source.match(/border-\[[^\]]+\]/g) ?? []).length;

  metrics.push({
    relativePath,
    themeBranches,
    inlineStyles,
    arbitrarySurfaces,
  });

  if (
    /src\/app\/components\/(primitives|patterns|shared|system)\//.test(relativePath) &&
    source.includes(`@/app/features/`)
  ) {
    featureLeakFiles.push(relativePath);
  }
}

function printTop(title, key) {
  console.log(`\n${title}`);
  metrics
    .filter((entry) => entry[key] > 0)
    .sort((a, b) => b[key] - a[key])
    .slice(0, 15)
    .forEach((entry) => {
      console.log(`- ${entry[key].toString().padStart(3, ' ')} ${entry.relativePath}`);
    });
}

printTop('Top files by theme branching', 'themeBranches');
printTop('Top files by inline style usage', 'inlineStyles');
printTop('Top files by arbitrary surface classes', 'arbitrarySurfaces');

console.log('\nShared-layer feature imports');
if (featureLeakFiles.length === 0) {
  console.log('- none');
} else {
  featureLeakFiles.sort().forEach((file) => console.log(`- ${file}`));
}
