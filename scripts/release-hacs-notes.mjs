import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { assertNotes, assertReleaseNotes, validateNotesBundle } from './release-note-contract.mjs';

const {
  HACS_REPOSITORY: repo,
  RELEASE_TAG: tag,
  RELEASE_SHA: sha,
  NOTES_BUNDLE: file,
} = process.env;
const bundle = validateNotesBundle(JSON.parse(readFileSync(file, 'utf8')), { tag, sha });
assertNotes(readFileSync(process.env.NOTES_FILE, 'utf8'), bundle.notes.hacs, 'HACS notes file');
const prerelease = process.env.PRERELEASE === 'true';
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' });
const result = spawnSync('gh', ['api', `repos/${repo}/releases/tags/${tag}`], { encoding: 'utf8' });
if (result.status !== 0) {
  if (!/HTTP 404/.test(result.stderr))
    throw new Error(result.stderr || 'HACS release lookup failed.');
  gh(
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
    ...(prerelease ? ['--prerelease'] : []),
  );
}
const release = JSON.parse(gh('api', `repos/${repo}/releases/tags/${tag}`));
assertReleaseNotes(release, { tag, prerelease, notes: bundle.notes.hacs });
console.log('HACS release notes match the pinned bundle.');
