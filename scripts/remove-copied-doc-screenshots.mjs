import { existsSync, lstatSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const app = process.argv[2];
if (!['standalone', 'demo', 'website', 'storybook'].includes(app)) {
  throw new Error('Expected one of: standalone, demo, website, storybook');
}

const dist = resolve(repoRoot, 'apps', app, 'dist');
const copiedDocs = join(dist, 'docs');
if (!existsSync(copiedDocs)) {
  console.log(`No copied documentation screenshots in ${app} build`);
  process.exit(0);
}

if (lstatSync(copiedDocs).isSymbolicLink()) {
  throw new Error(`Refusing to remove a symlink: ${copiedDocs}`);
}

const entries = readdirSync(copiedDocs);
if (entries.length !== 1 || entries[0] !== 'how-to') {
  throw new Error(`Unexpected content in ${copiedDocs}: ${entries.join(', ')}`);
}

rmSync(copiedDocs, { recursive: true });
console.log(`Removed copied documentation screenshots from ${app} build`);
