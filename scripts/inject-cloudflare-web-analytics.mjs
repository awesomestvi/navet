import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const surface = process.argv[2];
const supportedSurfaces = new Set(['website', 'demo', 'docs', 'storybook']);

if (!supportedSurfaces.has(surface)) {
  throw new Error(
    `Expected a public surface (${[...supportedSurfaces].join(', ')}), received: ${surface}`
  );
}

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDir = path.join(repoRoot, 'apps', surface, 'dist');
const beaconSource = 'https://static.cloudflareinsights.com/beacon.min.js';
const beaconSnippet =
  `<!-- Cloudflare Web Analytics --><script type='module' src='${beaconSource}' ` +
  `data-cf-beacon='{"token": "96f1b5d1f27b4b1f98ea95591956a977"}'></script>` +
  '<!-- End Cloudflare Web Analytics -->';

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findHtmlFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    })
  );

  return files.flat();
}

const htmlFiles =
  surface === 'storybook'
    ? [path.join(outputDir, 'index.html')]
    : await findHtmlFiles(outputDir);

if (htmlFiles.length === 0) {
  throw new Error(`No HTML files found in ${path.relative(repoRoot, outputDir)}`);
}

let injectedCount = 0;

for (const htmlPath of htmlFiles) {
  const html = await readFile(htmlPath, 'utf8');

  if (html.includes(beaconSnippet)) {
    continue;
  }

  if (html.includes(beaconSource)) {
    throw new Error(
      `A different Cloudflare Web Analytics snippet already exists in ${path.relative(repoRoot, htmlPath)}`
    );
  }

  const closingBodyIndex = html.toLowerCase().lastIndexOf('</body>');

  if (closingBodyIndex === -1) {
    throw new Error(`Missing </body> in ${path.relative(repoRoot, htmlPath)}`);
  }

  const lineStart = html.lastIndexOf('\n', closingBodyIndex) + 1;
  const closingBodyPrefix = html.slice(lineStart, closingBodyIndex);
  const indentation = /^\s*$/.test(closingBodyPrefix) ? closingBodyPrefix : '';
  const updatedHtml =
    html.slice(0, closingBodyIndex) +
    beaconSnippet +
    `\n${indentation}` +
    html.slice(closingBodyIndex);

  await writeFile(htmlPath, updatedHtml);
  injectedCount += 1;
}

console.log(
  `Injected Cloudflare Web Analytics into ${injectedCount} ${surface} HTML file${injectedCount === 1 ? '' : 's'}`
);
