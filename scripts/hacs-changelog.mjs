export function renderHacsChangelog({
  releaseVersion,
  releaseDate,
  releaseNotes,
  existingChangelog = '',
}) {
  const existing = changelogNotes(existingChangelog, releaseVersion);
  if (existing !== null) {
    assertNotes(existing, releaseNotes, `HACS ${releaseVersion}`);
    return existingChangelog;
  }
  const history = existingChangelog
    .replace(/\r\n/g, '\n')
    .replace(/^# Changelog\s*/, '')
    .trim();
  const historySection = history ? `\n${history}\n` : '';

  return `# Changelog\n\n## ${releaseVersion} (${releaseDate})\n\n${releaseNotes.trim()}\n${historySection}`;
}
import { assertNotes, changelogNotes } from './release-note-contract.mjs';
