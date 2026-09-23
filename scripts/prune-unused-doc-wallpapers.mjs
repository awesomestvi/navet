import { existsSync, lstatSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const dist = resolve(repoRoot, 'apps/docs/dist');
const wallpapers = join(dist, 'wallpapers');
if (!existsSync(wallpapers)) {
  throw new Error(`Missing copied wallpaper directory: ${wallpapers}`);
}
if (lstatSync(wallpapers).isSymbolicLink()) {
  throw new Error(`Refusing to remove a symlink: ${wallpapers}`);
}

const entries = readdirSync(wallpapers);
if (entries.length !== 1 || entries[0] !== 'generated') {
  throw new Error(`Unexpected wallpaper content: ${entries.join(', ')}`);
}

const textExtensions = /\.(?:css|html|js|json|webmanifest|xml)$/;
function checkReferences(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (file === wallpapers) continue;
    if (entry.isDirectory()) {
      checkReferences(file);
    } else if (entry.isFile() && textExtensions.test(entry.name)) {
      if (readFileSync(file, 'utf8').includes('/wallpapers/generated/')) {
        throw new Error(`Docs build references copied wallpapers: ${file}`);
      }
    }
  }
}

checkReferences(dist);
rmSync(wallpapers, { recursive: true });
console.log('Removed unused dashboard wallpapers from docs build');
