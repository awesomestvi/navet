import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const distDir = path.join(repoRoot, 'apps/docs/dist');
const screenshotsDir = path.join(distDir, 'docs/how-to');
const publicDir = path.join(repoRoot, 'assets/public');
const redirectsPath = path.join(distDir, '_redirects');
const redirectsDraftPath = path.join(distDir, '_redirects.tmp');
const textFilePattern = /\.(?:html|js|css|json|xml)$/;

async function* filesIn(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* filesIn(file);
    else if (entry.isFile()) yield file;
  }
}

if (existsSync(redirectsPath) || existsSync(redirectsDraftPath)) {
  throw new Error('Docs output already has a redirects file; preserve and review its rules first.');
}

const outputText = [];
for await (const file of filesIn(distDir)) {
  if (textFilePattern.test(file)) outputText.push(await readFile(file, 'utf8'));
}

const groups = new Map();
for await (const file of filesIn(screenshotsDir)) {
  if (!file.endsWith('.webp')) continue;
  const bytes = await readFile(file);
  const relativePath = path.relative(distDir, file).split(path.sep).join('/');
  if (!bytes.equals(await readFile(path.join(publicDir, relativePath)))) {
    throw new Error(`Docs screenshot differs from its public source: ${relativePath}`);
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  const group = groups.get(digest) ?? [];
  group.push({ file, relativePath, bytes });
  groups.set(digest, group);
}

const rewrites = [];
for (const group of groups.values()) {
  if (group.length < 2) continue;
  const referenced = group
    .filter(({ relativePath }) =>
      outputText.some((contents) => contents.includes(path.posix.basename(relativePath)))
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (referenced.length === 0) continue;
  const canonical = referenced[0];
  for (const alias of group) {
    if (referenced.includes(alias)) continue;
    if (!alias.bytes.equals(canonical.bytes)) {
      throw new Error(`Docs screenshot alias differs from ${canonical.relativePath}`);
    }
    rewrites.push({ alias, canonical });
  }
}

rewrites.sort((a, b) => a.alias.relativePath.localeCompare(b.alias.relativePath));
const rules = rewrites.map(
  ({ alias, canonical }) => `/${alias.relativePath} /${canonical.relativePath} 200`
);
if (rules.length === 0) {
  console.log('No unreferenced duplicate docs screenshots to prune');
  process.exit(0);
}

await writeFile(redirectsDraftPath, `${rules.join('\n')}\n`);
for (const { alias } of rewrites) await rm(alias.file);
await rename(redirectsDraftPath, redirectsPath);
const removedBytes = rewrites.reduce((total, { alias }) => total + alias.bytes.byteLength, 0);
console.log(`Removed ${rewrites.length} duplicate docs screenshots (${removedBytes} bytes); preserved URLs with local rewrites`);
