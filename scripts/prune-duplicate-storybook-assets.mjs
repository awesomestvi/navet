import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const distDir = path.join(repoRoot, 'apps/storybook/dist');
const sharedAssetsDir = path.join(distDir, 'sb-common-assets');
const copiedAssetNames = [
  'nunito-sans-regular.woff2',
  'nunito-sans-italic.woff2',
  'nunito-sans-bold.woff2',
  'nunito-sans-bold-italic.woff2',
  'favicon-wrapper.svg',
];

async function* outputFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* outputFiles(entryPath);
    else if (entry.isFile() && /\.(?:html|css|js|json|svg)$/.test(entry.name)) yield entryPath;
  }
}

const referencedFiles = [];
for await (const filePath of outputFiles(distDir)) {
  if (copiedAssetNames.includes(path.basename(filePath))) continue;
  referencedFiles.push({ path: filePath, contents: await readFile(filePath, 'utf8') });
}

let removedBytes = 0;
for (const assetName of copiedAssetNames) {
  const copiedAssetPath = path.join(distDir, assetName);
  const copiedAsset = await readFile(copiedAssetPath);
  const sharedAsset = await readFile(path.join(sharedAssetsDir, assetName));
  if (!copiedAsset.equals(sharedAsset)) {
    throw new Error(`Storybook root asset differs from its shared copy: ${assetName}`);
  }

  for (const file of referencedFiles) {
    const unrelatedReferences = file.contents
      .replaceAll(`sb-common-assets/${assetName}`, '')
      .includes(assetName);
    if (unrelatedReferences) {
      throw new Error(`Storybook output may reference root asset ${assetName}: ${file.path}`);
    }
  }

  await rm(copiedAssetPath);
  removedBytes += copiedAsset.byteLength;
}

console.log(`Removed ${removedBytes} duplicate Storybook asset bytes`);
