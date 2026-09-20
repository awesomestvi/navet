import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertAddonNotes,
  assertNotes,
  assertReleaseNotes,
  changelogNotes,
  validateNotesBundle,
} from './release-note-contract.mjs';

const {
  GITHUB_REPOSITORY: repo,
  HACS_REPOSITORY: hacs,
  RELEASE_TAG: tag,
  RELEASE_SHA: sha,
  NOTES_BUNDLE: file,
} = process.env;
const bundle = validateNotesBundle(JSON.parse(readFileSync(file, 'utf8')), { tag, sha });
const prerelease = tag.includes('-');
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' });
const api = (path) => JSON.parse(gh('api', path));
const content = (repository, path, ref) =>
  Buffer.from(api(`repos/${repository}/contents/${path}?ref=${ref}`).content, 'base64').toString(
    'utf8',
  );
assertReleaseNotes(api(`repos/${repo}/releases/tags/${tag}`), {
  tag,
  prerelease,
  notes: bundle.notes.general,
});
assertReleaseNotes(api(`repos/${hacs}/releases/tags/${tag}`), {
  tag,
  prerelease,
  notes: bundle.notes.hacs,
});
assertNotes(
  changelogNotes(content(hacs, 'CHANGELOG.md', tag), tag.slice(1)),
  bundle.notes.hacs,
  'HACS tagged changelog',
);
const addon = `platform/home-assistant/addons/${prerelease ? 'navet-dev' : 'navet'}`;
const mainSha = api(`repos/${repo}/git/ref/heads/main`).object.sha;
assertAddonNotes(
  content(repo, `${addon}/config.yaml`, mainSha),
  content(repo, `${addon}/CHANGELOG.md`, mainSha),
  bundle,
);
const directory = mkdtempSync(join(tmpdir(), 'navet-distribution-'));
gh(
  'release',
  'download',
  tag,
  '--repo',
  repo,
  '--pattern',
  'navet-release-notes.json',
  '--dir',
  directory,
);
const published = validateNotesBundle(
  JSON.parse(readFileSync(join(directory, 'navet-release-notes.json'), 'utf8')),
  { tag, sha },
);
if (JSON.stringify(published) !== JSON.stringify(bundle))
  throw new Error('Published notes evidence differs.');
if (!prerelease) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      assertReleaseNotes(api(`repos/${repo}/releases/latest`), {
        tag,
        prerelease,
        notes: bundle.notes.general,
      });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
console.log(
  'Verified release bodies, tagged HACS changelog, merged add-on metadata, and release-note evidence.',
);
