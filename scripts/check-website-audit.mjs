import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { appPaths, repoRoot } from './repo-paths.mjs';

const MAX_INITIAL_CODE_GZIP_BYTES = 650 * 1024;
const TARGET_STYLESHEET_GZIP_BYTES = 68 * 1024;
const STYLESHEET_GZIP_TOLERANCE_BYTES = 1024;
const MAX_STYLESHEET_GZIP_BYTES =
  TARGET_STYLESHEET_GZIP_BYTES + STYLESHEET_GZIP_TOLERANCE_BYTES;
const ALLOWED_THIRD_PARTY_SCRIPT_SOURCES = new Set([
  'https://static.cloudflareinsights.com/beacon.min.js',
]);

function fail(message) {
  throw new Error(`[website-audit] ${message}`);
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function requireFile(filePath, label) {
  if (!existsSync(filePath)) fail(`${label} is missing: ${filePath}`);
  return readFileSync(filePath);
}

const distDir = appPaths.websiteDist;
const indexPath = join(distDir, 'index.html');
const indexHtml = requireFile(indexPath, 'built website index').toString('utf8');
const packageVersion = JSON.parse(
  requireFile(join(repoRoot, 'package.json'), 'root package manifest').toString('utf8')
).version;
const initialAssetNames = Array.from(
  indexHtml.matchAll(/<(?:script|link)[^>]+(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g),
  (match) => match[1]
);

if (initialAssetNames.length === 0) fail('no initial JavaScript or stylesheet assets were found');
const thirdPartyScriptSources = Array.from(
  indexHtml.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi),
  (match) => match[1]
);
const unexpectedThirdPartyScriptSources = thirdPartyScriptSources.filter(
  (source) => !ALLOWED_THIRD_PARTY_SCRIPT_SOURCES.has(source)
);
if (unexpectedThirdPartyScriptSources.length > 0) {
  fail(
    `the initial document contains an unexpected third-party script: ${unexpectedThirdPartyScriptSources.join(', ')}`
  );
}

for (const requiredSeoMarkup of [
  '<title>Smart Home Dashboard for Home Assistant &amp; Homey | Navet</title>',
  '<link rel="canonical" href="https://navet.app/"',
  'https://navet.app/navet-social-card.jpg',
  'application/ld+json',
  `"softwareVersion": "${packageVersion}"`,
]) {
  if (!indexHtml.includes(requiredSeoMarkup)) {
    fail(`homepage is missing SEO markup: ${requiredSeoMarkup}`);
  }
}

let initialCodeGzipBytes = 0;
for (const assetName of initialAssetNames) {
  const asset = requireFile(join(distDir, 'assets', assetName), `initial asset ${assetName}`);
  const gzipBytes = gzipSync(asset).byteLength;
  initialCodeGzipBytes += gzipBytes;
  if (assetName.endsWith('.css') && gzipBytes > MAX_STYLESHEET_GZIP_BYTES) {
    fail(
      `${basename(assetName)} exceeds the stylesheet budget: ${formatKiB(gzipBytes)} > ${formatKiB(MAX_STYLESHEET_GZIP_BYTES)}`
    );
  }
}

if (initialCodeGzipBytes > MAX_INITIAL_CODE_GZIP_BYTES) {
  fail(
    `initial code exceeds budget: ${formatKiB(initialCodeGzipBytes)} > ${formatKiB(MAX_INITIAL_CODE_GZIP_BYTES)}`
  );
}

const headers = requireFile(join(distDir, '_headers'), 'Cloudflare security headers').toString(
  'utf8'
);
for (const requiredHeader of [
  'Content-Security-Policy:',
  'Strict-Transport-Security:',
  'Permissions-Policy:',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: SAMEORIGIN',
]) {
  if (!headers.includes(requiredHeader)) fail(`missing required header: ${requiredHeader}`);
}

const rootContentSecurityPolicy = headers
  .slice(headers.indexOf('\n/\n'), headers.indexOf('\n\n/roadmap/*'))
  .split(/\r?\n/)
  .find((line) => line.includes('Content-Security-Policy:'));
if (!rootContentSecurityPolicy) fail('homepage Content-Security-Policy is missing');
for (const directive of ['img-src', 'connect-src']) {
  const directiveValue = rootContentSecurityPolicy
    .split(';')
    .find((value) => value.trimStart().startsWith(`${directive} `));
  if (!directiveValue?.includes('https://tiles.openfreemap.org')) {
    fail(`${directive} must allow the OpenFreeMap production tile origin`);
  }
}

for (const line of headers.split(/\r?\n/)) {
  if (line.length > 2_000) fail('a _headers rule exceeds Cloudflare Pages’ 2,000-character limit');
}

const roadmapHtml = requireFile(join(distDir, 'roadmap', 'index.html'), 'roadmap route').toString(
  'utf8'
);
if (!roadmapHtml.includes('<title>Navet Roadmap — What is shipping now and next</title>')) {
  fail('roadmap route is missing its static route title');
}
if (!roadmapHtml.includes('<link rel="canonical" href="https://navet.app/roadmap/"')) {
  fail('roadmap route is missing its canonical URL');
}

const oauthHtml = requireFile(
  join(distDir, 'redirect', 'oauth', 'index.html'),
  'OAuth callback route'
).toString('utf8');
if (!oauthHtml.includes('content="noindex,nofollow"')) {
  fail('OAuth callback route must be excluded from search indexing');
}

requireFile(join(distDir, 'robots.txt'), 'robots.txt');
requireFile(join(distDir, 'sitemap.xml'), 'sitemap.xml');
requireFile(join(distDir, 'navet-social-card.jpg'), 'social preview image');
requireFile(
  join(repoRoot, 'apps', 'website', 'functions', 'api', 'music', 'apple', 'developer-token.ts'),
  'website Pages Function entry'
);

console.log(
  `Website audit gates passed: ${initialAssetNames.length} initial assets, ${formatKiB(initialCodeGzipBytes)} gzip.`
);
