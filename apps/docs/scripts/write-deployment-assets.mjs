import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlFilesIn, inlineScriptHashes } from '../../../scripts/inline-script-csp.mjs';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(appDir, "dist");
const assetNames = ["_headers", "robots.txt"];

for (const assetName of assetNames) {
  fs.copyFileSync(path.join(appDir, assetName), path.join(distDir, assetName));
}

const docsScriptHashes = new Set();
for (const htmlPath of htmlFilesIn(distDir)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const hash of inlineScriptHashes(html)) docsScriptHashes.add(hash);
}

if (docsScriptHashes.size === 0) {
  throw new Error('Expected generated documentation pages to contain inline boot scripts');
}

const headersPath = path.join(distDir, '_headers');
const headers = fs.readFileSync(headersPath, 'utf8');
const originalScriptPolicy = "script-src 'self' ";
if (!headers.includes(originalScriptPolicy)) {
  throw new Error('Could not find the docs script CSP policy');
}
const scriptPolicy = `script-src 'self' ${[...docsScriptHashes].sort().join(' ')} `;
const updatedHeaders = headers.replace(originalScriptPolicy, scriptPolicy);
if (updatedHeaders.split(/\r?\n/).some((line) => line.length > 2_000)) {
  throw new Error('A docs _headers rule exceeds the Cloudflare Pages line limit');
}
fs.writeFileSync(headersPath, updatedHeaders);

console.log(
  `Wrote docs deployment assets with ${docsScriptHashes.size} script hashes into ${distDir}`
);
