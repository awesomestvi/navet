import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderHacsChangelog } from './hacs-changelog.mjs';

// Use the immutable Git history, not the export's potentially already-prepended changelog.
const root = process.env.NAVET_HACS_EXPORT_ROOT;
const existingChangelog = execFileSync('git', ['-C', root, 'show', 'HEAD:CHANGELOG.md'], {
  encoding: 'utf8',
});
const changelog = renderHacsChangelog({
  existingChangelog,
  releaseVersion: process.env.NAVET_RELEASE_VERSION,
  releaseDate: new Date().toISOString().slice(0, 10),
  releaseNotes: readFileSync(process.env.NAVET_RELEASE_NOTES_FILE, 'utf8'),
});
writeFileSync(join(root, 'CHANGELOG.md'), changelog);
