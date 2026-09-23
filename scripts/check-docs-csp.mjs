import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-paths.mjs';

const distDir = join(repoRoot, 'apps/docs/dist');
const headers = readFileSync(join(distDir, '_headers'), 'utf8');
const policy = headers.match(/^  Content-Security-Policy: (.+)$/m)?.[1];
const scriptSources = policy?.match(/(?:^|; )script-src ([^;]+)/)?.[1];
if (!scriptSources || scriptSources.includes("'unsafe-inline'")) {
  throw new Error('Docs CSP must allow only listed scripts');
}
if (headers.split(/\r?\n/).some((line) => line.length > 2_000)) {
  throw new Error('A docs _headers rule exceeds the Cloudflare Pages line limit');
}

function htmlFilesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

let inlineScriptCount = 0;
const scriptHashes = new Set();
const htmlFiles = htmlFilesIn(distDir);
for (const htmlPath of htmlFiles) {
  const html = readFileSync(htmlPath, 'utf8');
  for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(attributes) || !content.trim()) continue;
    inlineScriptCount++;
    const hash = `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`;
    scriptHashes.add(hash);
    if (!scriptSources.includes(hash)) {
      throw new Error(`Docs CSP does not allow an inline script in ${htmlPath}`);
    }
  }
}

if (inlineScriptCount === 0) throw new Error('No docs inline scripts were checked');
const allowedHashes = scriptSources.match(/'sha256-[^']+'/g) ?? [];
if (allowedHashes.length !== scriptHashes.size) {
  throw new Error('Docs CSP has a stale or duplicate inline script hash');
}

console.log(
  `Docs CSP checked: ${htmlFiles.length} pages, ${inlineScriptCount} inline scripts, ${scriptHashes.size} hashes.`
);
