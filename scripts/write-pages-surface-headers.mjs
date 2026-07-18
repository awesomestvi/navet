import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const surface = process.argv[2];
const supportedSurfaces = new Set(['demo', 'storybook']);

if (!supportedSurfaces.has(surface)) {
  throw new Error(`Expected a Pages surface (${[...supportedSurfaces].join(', ')}), received: ${surface}`);
}

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sharedHeadersPath = path.join(repoRoot, 'apps/website/_headers');
const outputHeadersPath = path.join(repoRoot, `apps/${surface}/dist/_headers`);
const sharedHeaders = await readFile(sharedHeadersPath, 'utf8');
const rootRuleStart = sharedHeaders.indexOf('\n/\n');
const rootRuleEnd = sharedHeaders.indexOf('\n\n/roadmap/*', rootRuleStart);

if (rootRuleStart === -1 || rootRuleEnd === -1) {
  throw new Error('Could not find the root CSP rule in apps/website/_headers');
}

const rootRule = sharedHeaders.slice(rootRuleStart, rootRuleEnd);
const surfaceRootRule = rootRule
  .replace("script-src 'self' ", "script-src 'self' 'unsafe-inline' ")
  .replace(
    "img-src 'self' data: blob:;",
    "img-src 'self' data: blob: https://*.basemaps.cartocdn.com;"
  );

if (rootRule === surfaceRootRule) {
  throw new Error('Could not update the root script-src directive');
}

const surfaceHeaders = `${sharedHeaders.slice(0, rootRuleStart)}${surfaceRootRule}${sharedHeaders.slice(rootRuleEnd)}`;

await writeFile(outputHeadersPath, surfaceHeaders);

console.log(`Wrote ${surface} Cloudflare Pages headers to ${path.relative(repoRoot, outputHeadersPath)}`);
