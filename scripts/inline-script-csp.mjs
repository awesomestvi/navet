import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';

export function htmlFilesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

export function inlineElementContents(html, names = ['script']) {
  const contents = [];
  const visit = (node) => {
    if (names.includes(node.tagName) && !node.attrs?.some((attribute) => attribute.name === 'src')) {
      const content = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
      if (content.trim()) contents.push(content);
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(parse(html));
  return contents;
}

export function inlineScriptHashes(html) {
  return inlineElementContents(html).map((content) =>
    `'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`
  );
}
