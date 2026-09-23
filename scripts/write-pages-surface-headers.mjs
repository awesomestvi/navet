import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inlineScriptHashes } from './inline-script-csp.mjs';

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
let surfaceRootRule = rootRule;
let iframeRule = '';
if (surface === 'storybook') {
  const storybookDist = path.join(repoRoot, 'apps/storybook/dist');
  const managerHashes = inlineScriptHashes(
    await readFile(path.join(storybookDist, 'index.html'), 'utf8')
  );
  const previewHashes = inlineScriptHashes(
    await readFile(path.join(storybookDist, 'iframe.html'), 'utf8')
  );
  if (managerHashes.length === 0 || previewHashes.length === 0) {
    throw new Error('Expected Storybook manager and preview to contain inline boot scripts');
  }

  const storybookDirectives = [
    ["script-src 'self' ", `script-src 'self' ${managerHashes.join(' ')} `],
    ['frame-src ', "frame-src 'self' "],
  ];
  for (const [before, after] of storybookDirectives) {
    if (!surfaceRootRule.includes(before)) {
      throw new Error(`Could not update the Storybook ${before.trim()} directive`);
    }
    surfaceRootRule = surfaceRootRule.replace(before, after);
  }

  const iframePolicy = rootRule.match(/^  Content-Security-Policy: .+$/m)?.[0];
  if (!iframePolicy) throw new Error('Could not find the Storybook preview CSP policy');
  iframeRule = `\n\n/iframe.html\n${iframePolicy
    .replace("frame-ancestors 'none'", "frame-ancestors 'self'")
    .replace("script-src 'self' ", `script-src 'self' ${previewHashes.join(' ')} `)
    .replace('frame-src ', "frame-src 'self' ")}`;
}

if (surface === 'demo') {
  const demoHtml = await readFile(path.join(repoRoot, 'apps/demo/dist/index.html'), 'utf8');
  const inlineScripts = [...demoHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    ([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.trim()
  );
  if (inlineScripts.length > 0) {
    throw new Error('Demo build contains an inline script; review its CSP before publishing');
  }
}

const surfaceHeaders = `${sharedHeaders.slice(0, rootRuleStart)}${surfaceRootRule}${iframeRule}${sharedHeaders.slice(rootRuleEnd)}`;
if (surfaceHeaders.split(/\r?\n/).some((line) => line.length > 2_000)) {
  throw new Error(`${surface} _headers rule exceeds the Cloudflare Pages line limit`);
}

await writeFile(outputHeadersPath, surfaceHeaders);

console.log(`Wrote ${surface} Cloudflare Pages headers to ${path.relative(repoRoot, outputHeadersPath)}`);
