const versionHeadingPattern =
  /^##\s+(\d+\.\d+\.\d+(?:[-+][^\s]+)?)(?:\s+.*)?$/gm;

function getReleaseSection(changelog, version) {
  const normalizedChangelog = changelog.replace(/\r\n/g, '\n');
  const headings = [...normalizedChangelog.matchAll(versionHeadingPattern)];
  const releaseIndex = headings.findIndex((heading) => heading[1]?.trim() === version);

  if (releaseIndex === -1) {
    throw new Error(`CHANGELOG.md does not contain release highlights for ${version}.`);
  }

  const releaseHeading = headings[releaseIndex];
  const headingStart = releaseHeading.index ?? 0;
  const headingEnd = normalizedChangelog.indexOf('\n', headingStart);
  const start = headingEnd === -1 ? normalizedChangelog.length : headingEnd + 1;
  const end = headings[releaseIndex + 1]?.index ?? normalizedChangelog.length;

  return normalizedChangelog.slice(start, end);
}

function getHighlightType(category, description) {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes('security')) return 'Security';
  if (/^fixed\b/i.test(description) || normalizedCategory === 'fixed') return 'Fixed';
  if (/^(added|introduced|new)\b/i.test(description) || normalizedCategory.includes('new')) {
    return 'New';
  }

  return 'Improved';
}

export function getMarketingReleaseHighlights(changelog, version, limit = 3) {
  const releaseSection = getReleaseSection(changelog, version);
  const highlights = [];
  let category = '';

  for (const rawLine of releaseSection.split('\n')) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch?.[1]) {
      category = headingMatch[1].trim();
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (!bulletMatch?.[1]) continue;

    const description = bulletMatch[1].trim();
    const type = getHighlightType(category, description);
    highlights.push({ type, description });

    if (highlights.length === limit) break;
  }

  if (highlights.length === 0) {
    throw new Error(
      `CHANGELOG.md section for ${version} does not contain release highlight bullets.`
    );
  }

  return highlights;
}
