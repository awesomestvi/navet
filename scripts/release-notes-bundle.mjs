import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  listAddedReleaseFragmentFiles,
  readReleaseFragments,
  renderReleaseNotes,
} from './release-fragments.mjs';
import { notesDigest, validateNotesBundle } from './release-note-contract.mjs';

const value = (flag) => process.argv[process.argv.indexOf(flag) + 1];
for (const flag of ['--from', '--to', '--tag', '--output']) {
  if (!process.argv.includes(flag) || !value(flag)) throw new Error(`Missing ${flag}.`);
}
const resolve = (ref) =>
  execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
const sha = resolve(value('--to'));
const baseSha = resolve(value('--from'));
const fragments = readReleaseFragments(listAddedReleaseFragmentFiles(baseSha, sha), sha);
const notes = {
  general: renderReleaseNotes(fragments),
  hacs: renderReleaseNotes(fragments, { audience: 'hacs' }),
  homeAssistant: renderReleaseNotes(fragments, { audience: 'home-assistant' }),
};
const bundle = validateNotesBundle({
  schema: 1,
  tag: value('--tag'),
  sha,
  baseSha,
  notes,
  digests: Object.fromEntries(Object.entries(notes).map(([key, body]) => [key, notesDigest(body)])),
});
writeFileSync(value('--output'), `${JSON.stringify(bundle, null, 2)}\n`);
for (const [audience, body] of Object.entries(notes))
  writeFileSync(join(dirname(value('--output')), `${audience}.md`), body);
