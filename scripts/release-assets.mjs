import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertNotes, assertReleaseNotes, validateNotesBundle } from './release-note-contract.mjs';

const { GITHUB_REPOSITORY: repo, RELEASE_TAG: tag } = process.env;
if (!/^v\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(tag ?? ''))
  throw new Error('Invalid release tag.');
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const response = spawnSync('gh', ['api', `repos/${repo}/releases/tags/${tag}`], {
  encoding: 'utf8',
});
if (response.status !== 0 && !/HTTP 404/.test(response.stderr))
  throw new Error(response.stderr || 'Release lookup failed.');
let release = response.status === 0 ? JSON.parse(response.stdout) : null;
const assetName = `navet-panel-${tag}.tar.gz`;
const asset = release?.assets.find((entry) => entry.name === assetName);
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

if (process.argv[2] === 'restore-panel') {
  if (asset) {
    mkdirSync('release-assets', { recursive: true });
    gh(
      'release',
      'download',
      tag,
      '--repo',
      repo,
      '--pattern',
      assetName,
      '--dir',
      'release-assets',
    );
  }
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_OUTPUT, `exists=${Boolean(asset)}\n`);
} else if (process.argv[2] === 'publish') {
  const bundle = validateNotesBundle(JSON.parse(readFileSync(process.env.NOTES_BUNDLE, 'utf8')), {
    tag,
    sha: process.env.RELEASE_SHA,
  });
  assertNotes(
    readFileSync(process.env.NOTES_FILE, 'utf8'),
    bundle.notes.general,
    'Release notes file',
  );
  if (!release) {
    const args = [
      'release',
      'create',
      tag,
      '--repo',
      repo,
      '--verify-tag',
      '--title',
      tag,
      '--notes-file',
      process.env.NOTES_FILE,
    ];
    if (process.env.PRERELEASE === 'true') args.push('--prerelease');
    gh(...args);
    release = JSON.parse(gh('api', `repos/${repo}/releases/tags/${tag}`));
  }
  if (release.draft || release.prerelease !== (process.env.PRERELEASE === 'true'))
    throw new Error('Existing release has incompatible publication state.');
  assertReleaseNotes(release, {
    tag,
    prerelease: process.env.PRERELEASE === 'true',
    notes: bundle.notes.general,
  });
  const notesAsset = 'navet-release-notes.json';
  if (release.assets.some((entry) => entry.name === notesAsset)) {
    const directory = mkdtempSync(join(tmpdir(), 'navet-notes-verify-'));
    gh('release', 'download', tag, '--repo', repo, '--pattern', notesAsset, '--dir', directory);
    const previous = validateNotesBundle(
      JSON.parse(readFileSync(join(directory, notesAsset), 'utf8')),
      { tag, sha: bundle.sha },
    );
    if (JSON.stringify(previous) !== JSON.stringify(bundle))
      throw new Error('Published release notes bundle differs. Do not overwrite published notes.');
  } else {
    gh('release', 'upload', tag, process.env.NOTES_BUNDLE, '--repo', repo);
  }
  if (asset) {
    const directory = mkdtempSync(join(tmpdir(), 'navet-panel-verify-'));
    gh('release', 'download', tag, '--repo', repo, '--pattern', assetName, '--dir', directory);
    if (hash(join(directory, assetName)) !== hash(join('release-assets', assetName))) {
      throw new Error('Published panel differs. Create a new release; do not replace its assets.');
    }
  } else {
    gh('release', 'upload', tag, join('release-assets', assetName), '--repo', repo);
  }
} else throw new Error('Expected restore-panel or publish.');
