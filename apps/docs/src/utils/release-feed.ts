export function releaseKind(heading: string) {
  const normalized = heading.toLowerCase();
  if (normalized.includes('security')) return 'security';
  if (normalized.includes('new') || normalized.includes('feature')) return 'new';
  const improved = normalized.includes('improv');
  const fixed = normalized.includes('fix') || normalized.includes('bug');
  return improved && fixed ? 'improved fixed' : improved ? 'improved' : fixed ? 'fixed' : 'other';
}

export function parseReleaseGroups(body: string) {
  const groups: Array<{ title: string; kind: string; items: string[] }> = [];
  let group: (typeof groups)[number] | undefined;
  for (const line of body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((value) => value.trim())) {
    const heading = line.match(/^##\s+(.+)$/)?.[1];
    if (heading) {
      group = { title: heading, kind: releaseKind(heading), items: [] };
      groups.push(group);
    } else {
      const item = line.match(/^-\s+(.+)$/)?.[1];
      if (item && group) group.items.push(item);
    }
  }
  const visible = groups.filter((entry) => entry.items.length > 0);
  return visible.length
    ? visible
    : [
        {
          title: 'Release notes',
          kind: 'other',
          items: [body.trim() || 'No release notes were provided.'],
        },
      ];
}

export type FeedRelease = { version: string; date: string; url: string; body: string };
export function parseCachedReleases(value: unknown): FeedRelease[] {
  if (!Array.isArray(value) || value.length > 2000) throw new Error('Invalid cached releases.');
  return value.map((entry) => {
    if (
      !entry ||
      typeof entry.version !== 'string' ||
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      typeof entry.body !== 'string' ||
      typeof entry.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      !Number.isFinite(Date.parse(entry.date)) ||
      entry.url !== `https://github.com/awesomestvi/navet/releases/tag/v${entry.version}`
    )
      throw new Error('Invalid cached release.');
    return { version: entry.version, date: entry.date, url: entry.url, body: entry.body };
  });
}
