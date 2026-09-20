import type {
  MarketingLatestRelease,
  MarketingReleaseHighlight,
} from '@navet/app/marketing/constants/marketingReleaseHighlights';

type GithubReleaseResponse = {
  tag_name?: unknown;
  html_url?: unknown;
  body?: unknown;
};

function getHighlightType(category: string, description: string) {
  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory.includes('security')) return 'Security';
  if (/^fixed\b/i.test(description) || normalizedCategory === 'fixed') return 'Fixed';
  if (/^(added|introduced|new)\b/i.test(description) || normalizedCategory.includes('new')) {
    return 'New';
  }
  return 'Improved';
}

export function parseGithubReleaseHighlights(body: string, limit = 3) {
  const highlights: MarketingReleaseHighlight[] = [];
  let category = '';

  for (const rawLine of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch?.[1]) {
      category = headingMatch[1].trim();
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (!bulletMatch?.[1]) continue;
    const description = bulletMatch[1].trim();
    highlights.push({ type: getHighlightType(category, description), description });
    if (highlights.length === limit) break;
  }

  return highlights;
}

export function parseLatestGithubRelease(value: GithubReleaseResponse): MarketingLatestRelease {
  if (typeof value.tag_name !== 'string' || !/^v\d+\.\d+\.\d+$/.test(value.tag_name)) {
    throw new Error('GitHub latest release does not have a stable Navet tag.');
  }
  if (
    typeof value.html_url !== 'string' ||
    !value.html_url.startsWith('https://github.com/awesomestvi/navet/releases/tag/')
  ) {
    throw new Error('GitHub latest release does not have a valid release URL.');
  }
  if (typeof value.body !== 'string') {
    throw new Error('GitHub latest release does not contain release notes.');
  }

  const highlights = parseGithubReleaseHighlights(value.body);
  if (highlights.length === 0) {
    throw new Error('GitHub latest release does not contain release highlights.');
  }

  return {
    version: value.tag_name.slice(1),
    url: value.html_url,
    highlights,
  };
}
