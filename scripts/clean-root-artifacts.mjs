import { rm } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const removeAll = process.argv.includes('--all');

const rootArtifacts = ['.DS_Store', '.vite', 'build-storybook.log', 'dist', 'storybook-static'];
const cacheArtifacts = ['.cache/vite', '.cache/storybook-static'];

const targets = removeAll ? [...rootArtifacts, ...cacheArtifacts] : rootArtifacts;

for (const target of targets) {
  const absolutePath = path.join(cwd, target);
  try {
    await rm(absolutePath, { recursive: true, force: true });
    console.log(`removed ${target}`);
  } catch {
    // Keep cleanup best-effort and idempotent.
  }
}
