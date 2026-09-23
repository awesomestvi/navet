import { lstatSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const app = process.argv[2];
if (!['standalone', 'demo', 'website', 'docs', 'storybook'].includes(app)) {
  throw new Error('Expected one of: standalone, demo, website, docs, storybook');
}

const publicDir = join(repoRoot, 'assets/public');
const distDir = join(repoRoot, 'apps', app, 'dist');
const sourceOnlyFiles = ['README.md', 'boot-i18n.d.ts', 'boot-i18n.test.ts'];
let removedBytes = 0;

for (const name of sourceOnlyFiles) {
  const source = join(publicDir, name);
  const copy = join(distDir, name);
  if (!lstatSync(copy).isFile()) {
    throw new Error(`Expected a regular copied public file: ${copy}`);
  }

  const sourceBytes = readFileSync(source);
  if (!sourceBytes.equals(readFileSync(copy))) {
    throw new Error(`Copied public file differs from its source: ${copy}`);
  }

  rmSync(copy);
  removedBytes += sourceBytes.byteLength;
}

console.log(`Removed ${removedBytes} source-only public bytes from the ${app} build`);
