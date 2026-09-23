import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'apps/docs/dist');
const localOrigin = 'https://docs.navet.app';
const imageDimensions = new Map();

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* htmlFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield entryPath;
    }
  }
}

async function dimensionsFor(source) {
  if (imageDimensions.has(source)) return imageDimensions.get(source);

  const url = new URL(source, localOrigin);
  if (url.origin !== localOrigin || !source.startsWith('/')) return null;

  const assetPath = path.resolve(distDir, `.${decodeURIComponent(url.pathname)}`);
  if (!assetPath.startsWith(`${distDir}${path.sep}`)) {
    throw new Error(`Image path escapes the docs build: ${source}`);
  }

  const { width, height } = await sharp(assetPath).metadata();
  if (!width || !height) throw new Error(`Missing image dimensions: ${source}`);
  const dimensions = { width, height };
  imageDimensions.set(source, dimensions);
  return dimensions;
}

let updatedImages = 0;
let deferredImages = 0;
let updatedPages = 0;

for await (const filePath of htmlFiles(distDir)) {
  const html = await readFile(filePath, 'utf8');
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  let output = html;

  for (const [tag] of imageTags) {
    const source = tag.match(/\bsrc=(['"])(.*?)\1/i)?.[2];
    if (!source) continue;
    const dimensions = await dimensionsFor(source);
    if (!dimensions) continue;

    const attributes = [
      !/\swidth\s*=/i.test(tag) && `width="${dimensions.width}"`,
      !/\sheight\s*=/i.test(tag) && `height="${dimensions.height}"`,
      !/\sloading\s*=/i.test(tag) && 'loading="lazy"',
      !/\sdecoding\s*=/i.test(tag) && 'decoding="async"',
    ].filter(Boolean);
    if (attributes.length === 0) continue;

    output = output.replace(tag, tag.replace('<img', `<img ${attributes.join(' ')}`));
    updatedImages += 1;
    if (attributes.includes('loading="lazy"')) deferredImages += 1;
  }

  if (output !== html) {
    await writeFile(filePath, output);
    updatedPages += 1;
  }
}

console.log(
  `Optimized ${updatedImages} images on ${updatedPages} docs pages; deferred ${deferredImages} until near the viewport`
);
