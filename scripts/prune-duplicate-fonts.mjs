import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const app = process.argv[2];
if (!['standalone', 'demo', 'website', 'docs', 'storybook'].includes(app)) {
  throw new Error('Expected one of: standalone, demo, website, docs, storybook');
}

const distDir = path.join(repoRoot, 'apps', app, 'dist');
const copiedFontDir = path.join(distDir, 'fonts/inter');
const generatedAssetDir = path.join(distDir, app === 'docs' ? '_astro' : 'assets');
const copiedFontNames = [
  'inter-latin-wght-normal.woff2',
  'inter-latin-ext-wght-normal.woff2',
];

async function* outputFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (directory === path.join(distDir, 'fonts') && entry.name === 'inter') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* outputFiles(entryPath);
    else if (entry.isFile() && /\.(?:html|css|js|json)$/.test(entry.name)) yield entryPath;
  }
}

for await (const filePath of outputFiles(distDir)) {
  const contents = await readFile(filePath, 'utf8');
  if (contents.includes('/fonts/inter/') || contents.includes('fonts/inter/inter.css')) {
    throw new Error(`Docs output still references copied Inter fonts: ${filePath}`);
  }
}

const generatedAssets = await readdir(generatedAssetDir);
const duplicates = [];
for (const fontName of copiedFontNames) {
  const stem = fontName.slice(0, -'.woff2'.length);
  const matches = generatedAssets.filter(
    (assetName) =>
      (assetName.startsWith(`${stem}.`) || assetName.startsWith(`${stem}-`)) &&
      assetName.endsWith('.woff2')
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one generated copy of ${fontName}; found ${matches.length}`);
  }

  const copiedFontPath = path.join(copiedFontDir, fontName);
  const copiedFont = await readFile(copiedFontPath);
  const generatedFont = await readFile(path.join(generatedAssetDir, matches[0]));
  if (!copiedFont.equals(generatedFont)) {
    throw new Error(`Generated Inter font differs from copied asset: ${fontName}`);
  }

  duplicates.push({ path: copiedFontPath, bytes: copiedFont.byteLength });
}

for (const duplicate of duplicates) await rm(duplicate.path);
await rm(path.join(copiedFontDir, 'inter.css'));
const removedBytes = duplicates.reduce((total, duplicate) => total + duplicate.bytes, 0);
console.log(`Removed ${removedBytes} duplicate Inter font bytes from the ${app} build`);
