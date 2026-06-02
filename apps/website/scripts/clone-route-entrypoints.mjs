import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const distDir = path.join(workspaceRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const routeClones = ['install', 'roadmap'];

if (!fs.existsSync(indexPath)) {
  throw new Error(`Website index.html is missing: ${indexPath}`);
}

for (const route of routeClones) {
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(routeDir, 'index.html'));
}

console.log(`Cloned website route entrypoints into ${distDir}`);
