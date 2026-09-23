import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export function htmlFilesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, content]) => !/\bsrc\s*=/.test(attributes) && content.trim())
    .map(([, , content]) =>
      `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`
    );
}
