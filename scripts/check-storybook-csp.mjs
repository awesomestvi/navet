import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const distDir = join(repoRoot, 'apps/storybook/dist');
const headers = readFileSync(join(distDir, '_headers'), 'utf8');
const rules = headers.split(/\r?\n\r?\n/);

for (const [route, htmlFile] of [
  ['/', 'index.html'],
  ['/iframe', 'iframe.html'],
  ['/iframe.html', 'iframe.html'],
]) {
  const rule = rules.find((block) => block.startsWith(`${route}\n`));
  const policy = rule?.match(/^  Content-Security-Policy: (.+)$/m)?.[1];
  const scriptSources = policy?.match(/(?:^|; )script-src ([^;]+)/)?.[1];
  if (!scriptSources || scriptSources.includes("'unsafe-inline'")) {
    throw new Error(`Storybook ${route} must have a restricted script CSP`);
  }

  const html = readFileSync(join(distDir, htmlFile), 'utf8');
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    ([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.trim()
  );
  if (inlineScripts.length === 0) throw new Error(`No inline scripts were checked in ${htmlFile}`);
  for (const [, , content] of inlineScripts) {
    const hash = `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`;
    if (!scriptSources.includes(hash)) {
      throw new Error(`Storybook ${route} CSP does not allow an inline script`);
    }
  }
  const allowedHashes = scriptSources.match(/'sha256-[^']+'/g) ?? [];
  if (allowedHashes.length !== inlineScripts.length) {
    throw new Error(`Storybook ${route} CSP has a stale or duplicate script hash`);
  }
  if (route === '/' && !policy.includes("frame-src 'self'")) {
    throw new Error('Storybook manager CSP must allow its same-origin preview frame');
  }
  if (route !== '/' && !policy.includes("frame-ancestors 'self'")) {
    throw new Error('Storybook preview CSP must allow its same-origin manager');
  }
}

if (headers.split(/\r?\n/).some((line) => line.length > 2_000)) {
  throw new Error('A Storybook _headers rule exceeds the Cloudflare Pages line limit');
}

console.log('Storybook CSP checked: manager and preview inline scripts use exact hashes.');
