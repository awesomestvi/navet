import fs from 'node:fs';
import process from 'node:process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const tag = process.argv[2]?.trim();

if (!tag) {
  console.error('Missing release tag. Usage: node scripts/extract-release-notes.mjs v0.1.1-beta.1');
  process.exit(1);
}

const version = tag.startsWith('v') ? tag.slice(1) : tag;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = resolve(root, 'CHANGELOG.md');
const changelog = fs.readFileSync(changelogPath, 'utf8').replace(/\r\n/g, '\n');
const headingPattern = /^##\s+(\d+\.\d+\.\d+(?:[-+][^\s]+)?)(?:\s+.*)?$/gm;
const headings = [...changelog.matchAll(headingPattern)];

const releaseHeading = headings.find((heading) => {
  const title = heading[1]?.trim() ?? '';
  return title === version;
});

if (!releaseHeading) {
  const availableVersions = headings
    .map((heading) => heading[1]?.trim().split(/\s+/, 1)[0])
    .filter(Boolean);

  console.error(`No CHANGELOG.md section found for ${version}.`);

  if (availableVersions.length > 0) {
    console.error(`Available versions: ${availableVersions.join(', ')}`);
  }

  process.exit(1);
}

const releaseIndex = headings.indexOf(releaseHeading);
const headingStart = releaseHeading.index ?? 0;
const headingEnd = changelog.indexOf('\n', headingStart);
const start = headingEnd === -1 ? changelog.length : headingEnd + 1;
const nextHeading = headings[releaseIndex + 1];
const end = nextHeading?.index ?? changelog.length;
const releaseNotes = changelog.slice(start, end).trim();

if (!releaseNotes) {
  console.error(`CHANGELOG.md section for ${version} is empty.`);
  process.exit(1);
}

process.stdout.write(`${releaseNotes}\n`);
