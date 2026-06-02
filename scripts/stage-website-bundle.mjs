import fs from 'node:fs';
import path from 'node:path';
import { appPaths } from './repo-paths.mjs';

const WEBSITE_ROUTE_CLONES = ['install', 'roadmap'];
const DEMO_ROUTE_CLONES = ['energy', 'security', 'tasks', 'locks', 'lights', 'media', 'settings'];

function assertDir(dirPath, label) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${label} is missing: ${dirPath}`);
  }
}

function resetDir(dirPath) {
  fs.rmSync(dirPath, { force: true, recursive: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDirContents(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function copyIndexToRoute(indexPath, routeDir) {
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(routeDir, 'index.html'));
}

assertDir(appPaths.websiteDist, 'Website build output');
assertDir(appPaths.demoDist, 'Demo build output');
assertDir(appPaths.storybookDist, 'Storybook build output');

const websiteIndexPath = path.join(appPaths.websiteDist, 'index.html');
const demoIndexPath = path.join(appPaths.demoDist, 'index.html');

if (!fs.existsSync(websiteIndexPath)) {
  throw new Error(`Website index.html is missing: ${websiteIndexPath}`);
}

if (!fs.existsSync(demoIndexPath)) {
  throw new Error(`Demo index.html is missing: ${demoIndexPath}`);
}

const websiteDemoDir = path.join(appPaths.websiteDist, 'demo');
const websiteStorybookDir = path.join(appPaths.websiteDist, 'storybook');

resetDir(websiteDemoDir);
resetDir(websiteStorybookDir);

copyDirContents(appPaths.demoDist, websiteDemoDir);
copyDirContents(appPaths.storybookDist, websiteStorybookDir);

for (const route of WEBSITE_ROUTE_CLONES) {
  copyIndexToRoute(websiteIndexPath, path.join(appPaths.websiteDist, route));
}

for (const route of DEMO_ROUTE_CLONES) {
  copyIndexToRoute(demoIndexPath, path.join(websiteDemoDir, route));
}

console.log('Staged Cloudflare website bundle:');
console.log(`- website: ${appPaths.websiteDist}`);
console.log(`- demo: ${websiteDemoDir}`);
console.log(`- storybook: ${websiteStorybookDir}`);
