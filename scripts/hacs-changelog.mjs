export function renderHacsChangelog({
  releaseVersion,
  releaseDate,
  releaseNotes,
  existingChangelog = '',
}) {
  const history = existingChangelog
    .replace(/\r\n/g, '\n')
    .replace(/^# Changelog\s*/, '')
    .trim();
  const historySection = history ? `\n${history}\n` : '';

  return `# Changelog\n\n## ${releaseVersion} (${releaseDate})\n\n${releaseNotes.trim()}\n${historySection}`;
}
