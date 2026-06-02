import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { assetPaths, repoRoot } from './repo-paths.mjs';

const rootDir = repoRoot;
const sourceDir = assetPaths.wallpapersSource;
const generatedDir = assetPaths.generatedWallpapers;
const manifestPath = resolve(generatedDir, 'manifest.json');

const targetWidth = 1920;
const targetHeight = 1080;
const maxAvifBytes = 450 * 1024;
const maxWebpBytes = 700 * 1024;
const supportedSourceExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const shippedLegacyExtensions = new Set(['.png', '.jpg', '.jpeg']);

function usage() {
  console.log(`Usage: node scripts/wallpapers.mjs <audit|optimize|check> [--grain]`);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function ensureDirectory(path) {
  await mkdir(path, { recursive: true });
}

async function listSourceWallpapers() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => supportedSourceExtensions.has(extname(name).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));

  const wallpapers = [];
  for (const fileName of files) {
    const filePath = resolve(sourceDir, fileName);
    const metadata = await sharp(filePath).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) {
      throw new Error(`Unsupported wallpaper source "${fileName}".`);
    }

    wallpapers.push({
      fileName,
      filePath,
      id: basename(fileName, extname(fileName)),
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      sizeBytes: (await stat(filePath)).size,
      sha256: await sha256File(filePath),
    });
  }

  return wallpapers;
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function createSeed(input) {
  return input.split('').reduce((seed, char) => (seed * 33 + char.charCodeAt(0)) >>> 0, 5381);
}

function createNoiseOverlay(width, height, seed) {
  const channels = 4;
  const buffer = Buffer.alloc(width * height * channels);
  let state = seed >>> 0;

  for (let index = 0; index < buffer.length; index += channels) {
    state = (1664525 * state + 1013904223) >>> 0;
    const delta = (state & 0xff) % 5 - 2;
    const value = 128 + delta;

    buffer[index] = value;
    buffer[index + 1] = value;
    buffer[index + 2] = value;
    buffer[index + 3] = 7;
  }

  return buffer;
}

async function renderWallpaper(source, { addGrain }) {
  let image = sharp(source.filePath).resize({
    width: targetWidth,
    height: targetHeight,
    fit: 'cover',
    position: 'centre',
  });

  if (addGrain) {
    image = image.composite([
      {
        input: createNoiseOverlay(targetWidth, targetHeight, createSeed(source.id)),
        raw: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
        },
        blend: 'overlay',
      },
    ]);
  }

  return image.removeAlpha().toBuffer();
}

function publicSrc(filePath) {
  return `/${relative(assetPaths.public, filePath).replaceAll('\\', '/')}`;
}

async function optimizeWallpapers({ addGrain }) {
  await rm(generatedDir, { recursive: true, force: true });
  await ensureDirectory(generatedDir);

  const sources = await listSourceWallpapers();
  const manifestEntries = [];

  for (const source of sources) {
    const rendered = await renderWallpaper(source, { addGrain });
    const avifPath = resolve(generatedDir, `${source.id}.avif`);
    const webpPath = resolve(generatedDir, `${source.id}.webp`);

    await sharp(rendered)
      .avif({ quality: 50, effort: 6 })
      .toFile(avifPath);
    await sharp(rendered)
      .webp({ quality: 74, effort: 6 })
      .toFile(webpPath);

    const avifBytes = (await stat(avifPath)).size;
    const webpBytes = (await stat(webpPath)).size;

    manifestEntries.push({
      id: source.id,
      sourceFile: source.fileName,
      sourceSha256: source.sha256,
      sourceBytes: source.sizeBytes,
      avifSrc: publicSrc(avifPath),
      webpSrc: publicSrc(webpPath),
      width: targetWidth,
      height: targetHeight,
      avifBytes,
      webpBytes,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    wallpapers: manifestEntries,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.table(
    manifestEntries.map((entry) => ({
      id: entry.id,
      source: entry.sourceFile,
      sourceSize: formatBytes(entry.sourceBytes),
      avifSize: formatBytes(entry.avifBytes),
      webpSize: formatBytes(entry.webpBytes),
      dimensions: `${entry.width}x${entry.height}`,
    }))
  );
}

async function readManifest() {
  const contents = await readFile(manifestPath, 'utf8');
  return JSON.parse(contents);
}

async function auditWallpapers() {
  const sources = await listSourceWallpapers();
  let manifest = null;

  try {
    manifest = await readManifest();
  } catch {
    manifest = null;
  }

  const generatedById = new Map(
    (manifest?.wallpapers ?? []).map((entry) => [entry.id, entry])
  );

  console.table(
    sources.map((source) => {
      const generated = generatedById.get(source.id);
      return {
        id: source.id,
        fileName: source.fileName,
        format: source.format,
        dimensions: `${source.width}x${source.height}`,
        sourceSize: formatBytes(source.sizeBytes),
        avifSize: generated ? formatBytes(generated.avifBytes) : 'missing',
        webpSize: generated ? formatBytes(generated.webpBytes) : 'missing',
      };
    })
  );
}

async function checkWallpapers() {
  const sources = await listSourceWallpapers();
  const manifest = await readManifest();
  const errors = [];
  const manifestEntries = new Map(manifest.wallpapers.map((entry) => [entry.id, entry]));
  const sourceIds = new Set(sources.map((source) => source.id));

  for (const entry of manifest.wallpapers) {
    if (!sourceIds.has(entry.id)) {
      errors.push(`Manifest entry "${entry.id}" has no source wallpaper.`);
    }
  }

  for (const source of sources) {
    const entry = manifestEntries.get(source.id);
    if (!entry) {
      errors.push(`Missing manifest entry for "${source.id}".`);
      continue;
    }

    const avifPath = resolve(assetPaths.public, `.${entry.avifSrc}`);
    const webpPath = resolve(assetPaths.public, `.${entry.webpSrc}`);

    if (entry.sourceFile !== source.fileName) {
      errors.push(`Manifest sourceFile mismatch for "${source.id}".`);
    }

    if (entry.sourceBytes !== source.sizeBytes) {
      errors.push(`Manifest sourceBytes mismatch for "${source.id}".`);
    }

    if (entry.sourceSha256 !== source.sha256) {
      errors.push(`Manifest sourceSha256 mismatch for "${source.id}".`);
    }

    if (entry.width !== targetWidth || entry.height !== targetHeight) {
      errors.push(`Manifest dimensions for "${source.id}" must be ${targetWidth}x${targetHeight}.`);
    }

    try {
      const avifStats = await stat(avifPath);
      const avifMetadata = await sharp(avifPath).metadata();
      if (avifStats.size !== entry.avifBytes) {
        errors.push(`Manifest avifBytes mismatch for "${source.id}".`);
      }
      if (avifMetadata.width !== targetWidth || avifMetadata.height !== targetHeight) {
        errors.push(`AVIF output for "${source.id}" is not ${targetWidth}x${targetHeight}.`);
      }
      if (avifStats.size > maxAvifBytes) {
        errors.push(`AVIF output for "${source.id}" exceeds ${formatBytes(maxAvifBytes)}.`);
      }
    } catch {
      errors.push(`Missing AVIF output for "${source.id}".`);
    }

    try {
      const webpStats = await stat(webpPath);
      const webpMetadata = await sharp(webpPath).metadata();
      if (webpStats.size !== entry.webpBytes) {
        errors.push(`Manifest webpBytes mismatch for "${source.id}".`);
      }
      if (webpMetadata.width !== targetWidth || webpMetadata.height !== targetHeight) {
        errors.push(`WebP output for "${source.id}" is not ${targetWidth}x${targetHeight}.`);
      }
      if (webpStats.size > maxWebpBytes) {
        errors.push(`WebP output for "${source.id}" exceeds ${formatBytes(maxWebpBytes)}.`);
      }
    } catch {
      errors.push(`Missing WebP output for "${source.id}".`);
    }
  }

  const legacyShippedFiles = (
    await readdir(resolve(assetPaths.public, 'wallpapers'), { withFileTypes: true })
  )
    .filter((entry) => entry.isFile())
    .filter((entry) => shippedLegacyExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);

  if (legacyShippedFiles.length > 0) {
    errors.push(
      `Legacy shipped wallpaper raster files remain in assets/public/wallpapers: ${legacyShippedFiles.join(', ')}.`
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Wallpaper outputs are valid for ${sources.length} built-in wallpapers.`);
}

const command = process.argv[2];
const addGrain = process.argv.includes('--grain');

switch (command) {
  case 'audit':
    await auditWallpapers();
    break;
  case 'optimize':
    await optimizeWallpapers({ addGrain });
    break;
  case 'check':
    await checkWallpapers();
    break;
  default:
    usage();
    process.exitCode = 1;
}
