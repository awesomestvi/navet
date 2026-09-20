import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateNotesBundle, assertAddonNotes } from './release-note-contract.mjs';

const bundle = validateNotesBundle(JSON.parse(readFileSync(process.env.NOTES_BUNDLE, 'utf8')), {
  tag: process.env.RELEASE_TAG,
  sha: process.env.RELEASE_SHA,
});
const ref = process.env.METADATA_SHA;
if (!/^[a-f0-9]{40}$/.test(ref ?? ''))
  throw new Error('Metadata verification requires an exact commit.');
const addon = `platform/home-assistant/addons/${bundle.tag.includes('-') ? 'navet-dev' : 'navet'}`;
const read = (file) =>
  Buffer.from(
    JSON.parse(
      execFileSync(
        'gh',
        ['api', `repos/${process.env.GITHUB_REPOSITORY}/contents/${addon}/${file}?ref=${ref}`],
        { encoding: 'utf8' },
      ),
    ).content,
    'base64',
  ).toString('utf8');
assertAddonNotes(read('config.yaml'), read('CHANGELOG.md'), bundle);
console.log('Metadata PR version and notes match the pinned release bundle.');
