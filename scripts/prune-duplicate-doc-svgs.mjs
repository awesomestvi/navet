import { createHash } from 'node:crypto';
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const distDir = path.join(repoRoot, 'apps/docs/dist');
const assetDir = path.join(distDir, '_astro');

async function* builtFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Unexpected symlink in docs build: ${filePath}`);
    }
    if (entry.isDirectory()) yield* builtFiles(filePath);
    else if (entry.isFile()) yield filePath;
  }
}

const output = new Map();
for await (const filePath of builtFiles(distDir)) {
  output.set(filePath, await readFile(filePath));
}

const duplicateSvgs = new Map();
for (const [filePath, contents] of output) {
  if (path.dirname(filePath) !== assetDir || !filePath.endsWith('.svg')) continue;
  const hash = createHash('sha256').update(contents).digest('hex');
  const matches = duplicateSvgs.get(hash) ?? [];
  matches.push(filePath);
  duplicateSvgs.set(hash, matches);
}

let removedBytes = 0;
let removedFiles = 0;
for (const matches of duplicateSvgs.values()) {
  if (matches.length < 2) continue;

  const referenced = matches.filter((filePath) => {
    const name = Buffer.from(path.basename(filePath));
    return [...output].some(
      ([otherPath, contents]) => otherPath !== filePath && contents.includes(name)
    );
  });
  if (referenced.length !== 1) continue;

  for (const filePath of matches) {
    if (filePath === referenced[0]) continue;
    removedBytes += output.get(filePath).byteLength;
    removedFiles += 1;
    await rm(filePath);
  }
}

console.log(`Removed ${removedFiles} unreferenced duplicate docs SVGs (${removedBytes} bytes)`);
