import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const removeAll = process.argv.includes('--all');

const ignoredDirectories = new Set(['.git', 'node_modules']);
const rootArtifacts = [
  '.DS_Store',
  '.vite',
  'build-storybook.log',
  'debug-storybook.log',
  'build',
  'dist',
  'demo',
  'storybook-static',
  'website',
];
const cacheArtifacts = ['.cache/vite', '.cache/storybook-static'];

const targets = removeAll ? [...rootArtifacts, ...cacheArtifacts] : rootArtifacts;

async function removeTarget(target) {
  const absolutePath = path.join(cwd, target);
  try {
    await rm(absolutePath, { recursive: true });
    console.log(`removed ${target}`);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }

    // Keep cleanup best-effort and idempotent.
  }
}

async function removeOsArtifacts(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(cwd, absolutePath);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await removeOsArtifacts(absolutePath);
      }
      continue;
    }

    if (entry.isFile() && entry.name === '.DS_Store') {
      await removeTarget(relativePath);
    }
  }
}

for (const target of targets) {
  await removeTarget(target);
}

await removeOsArtifacts(cwd);
