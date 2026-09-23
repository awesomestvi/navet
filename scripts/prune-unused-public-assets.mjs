import { existsSync, lstatSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const app = process.argv[2];
if (!['website', 'demo', 'docs', 'storybook'].includes(app)) {
  throw new Error('Expected one of: website, demo, docs, storybook');
}

const dist = resolve(repoRoot, 'apps', app, 'dist');
const publicDir = resolve(repoRoot, 'assets/public');
const assetNames = [
  'site.webmanifest',
  'pwa-192.png',
  'pwa-512.png',
  'pwa-maskable-192.png',
  'pwa-maskable-512.png',
];
if (app === 'docs' || app === 'storybook') {
  assetNames.push('navet-social-card.jpg');
}
const assetPaths = new Set(assetNames.map((name) => join(dist, name)));
const resourceAttributes = /\b(?:href|src|srcset|content)\s*=\s*(["'])(.*?)\1/gi;
const inlineResources = /<(?:script|style)\b[^>]*>([\s\S]*?)<\/(?:script|style)>/gi;

function referencedAsset(file, content) {
  if (file.endsWith('.html')) {
    const values = [
      ...[...content.matchAll(resourceAttributes)].map((match) => match[2]),
      ...[...content.matchAll(inlineResources)].map((match) => match[1]),
    ];
    return assetNames.find((name) => values.some((value) => value.includes(name)));
  }

  return assetNames.find((name) => content.includes(name));
}

function checkReferences(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (assetPaths.has(file)) continue;
    if (entry.isDirectory()) {
      checkReferences(file);
    } else if (entry.isFile() && /\.(?:css|html|js|json|svg|webmanifest|xml)$/.test(entry.name)) {
      const referenced = referencedAsset(file, readFileSync(file, 'utf8'));
      if (referenced) {
        throw new Error(`${app} build references ${referenced} in ${file}`);
      }
    }
  }
}

checkReferences(dist);

let removedBytes = 0;
for (const name of assetNames) {
  const source = join(publicDir, name);
  const target = join(dist, name);
  if (!existsSync(target) || !lstatSync(target).isFile()) {
    throw new Error(`Missing copied public asset: ${target}`);
  }

  const sourceBytes = readFileSync(source);
  if (!sourceBytes.equals(readFileSync(target))) {
    throw new Error(`Copied public asset differs from its source: ${target}`);
  }

  removedBytes += sourceBytes.byteLength;
  rmSync(target);
}

console.log(`Removed ${removedBytes} unreferenced public asset bytes from the ${app} build`);
