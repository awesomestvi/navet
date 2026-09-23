import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(appDir, "dist");
const assetNames = ["_headers", "robots.txt"];

for (const assetName of assetNames) {
  fs.copyFileSync(path.join(appDir, assetName), path.join(distDir, assetName));
}

function htmlFilesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

const inlineScriptHashes = new Set();
for (const htmlPath of htmlFilesIn(distDir)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(attributes) || !content.trim()) continue;
    inlineScriptHashes.add(
      `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`
    );
  }
}

if (inlineScriptHashes.size === 0) {
  throw new Error('Expected generated documentation pages to contain inline boot scripts');
}

const headersPath = path.join(distDir, '_headers');
const headers = fs.readFileSync(headersPath, 'utf8');
const originalScriptPolicy = "script-src 'self' ";
if (!headers.includes(originalScriptPolicy)) {
  throw new Error('Could not find the docs script CSP policy');
}
const scriptPolicy = `script-src 'self' ${[...inlineScriptHashes].sort().join(' ')} `;
const updatedHeaders = headers.replace(originalScriptPolicy, scriptPolicy);
if (updatedHeaders.split(/\r?\n/).some((line) => line.length > 2_000)) {
  throw new Error('A docs _headers rule exceeds the Cloudflare Pages line limit');
}
fs.writeFileSync(headersPath, updatedHeaders);

console.log(
  `Wrote docs deployment assets with ${inlineScriptHashes.size} script hashes into ${distDir}`
);
