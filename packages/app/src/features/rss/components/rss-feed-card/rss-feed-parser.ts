import { sanitizeExternalUrl, sanitizeImageUrl } from '@navet/app/utils/url-security';
import type { RSSItem } from './types';

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const readNodeText = (element: Element | null | undefined): string | undefined => {
  const value = element?.textContent?.trim();
  return value ? value : undefined;
};

const readFirstText = (root: Element, selectors: string[]): string | undefined => {
  for (const selector of selectors) {
    const match = root.querySelector(selector);
    const value = readNodeText(match);
    if (value) {
      return value;
    }
  }

  return undefined;
};

function formatRelativeFromNow(
  publishedAt: Date,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
) {
  const diffMs = publishedAt.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    return formatRelativeTime(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatRelativeTime(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatRelativeTime(diffDays, 'day');
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return formatRelativeTime(diffMonths, 'month');
  }

  const diffYears = Math.round(diffMonths / 12);
  return formatRelativeTime(diffYears, 'year');
}

export function toRSSItem({
  id,
  title,
  providerName,
  link,
  fallbackRecentLabel,
  publishedAtRaw,
  excerpt,
  imageUrl,
  formatRelativeTime,
}: {
  id: string;
  title: string;
  providerName: string;
  link: string;
  fallbackRecentLabel: string;
  publishedAtRaw?: string;
  excerpt?: string;
  imageUrl?: string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;
}): RSSItem {
  const safeLink = sanitizeExternalUrl(link) ?? '#';
  const safeImageUrl = sanitizeImageUrl(imageUrl);
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;
  const publishedAtMs = publishedAt?.getTime();
  const hasValidPublishedAt = typeof publishedAtMs === 'number' && !Number.isNaN(publishedAtMs);
  let timeAgo = fallbackRecentLabel;
  if (hasValidPublishedAt && publishedAt) {
    timeAgo = formatRelativeFromNow(publishedAt, formatRelativeTime);
  }

  return {
    id,
    title,
    source: providerName,
    timeAgo,
    url: safeLink,
    excerpt: excerpt ? stripHtml(excerpt) : undefined,
    imageUrl: safeImageUrl ?? undefined,
    publishedAtMs: hasValidPublishedAt ? publishedAtMs : undefined,
  };
}

export function parseRSSDocument(
  xml: string,
  providerName: string,
  fallbackRecentLabel: string,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
): RSSItem[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror');

  if (parserError) {
    throw new Error('invalid-feed-format');
  }

  const rssItems = Array.from(document.querySelectorAll('rss > channel > item'));
  if (rssItems.length > 0) {
    return rssItems
      .map((item) => {
        const link = readFirstText(item, ['link']) ?? readFirstText(item, ['guid']);
        const title = readFirstText(item, ['title']);

        if (!link || !title) {
          return null;
        }

        const mediaContent = item.querySelector('media\\:content, content');
        const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');

        return toRSSItem({
          id: readFirstText(item, ['guid']) ?? link,
          title,
          providerName,
          link,
          fallbackRecentLabel,
          formatRelativeTime,
          publishedAtRaw: readFirstText(item, ['pubDate', 'dc\\:date']),
          excerpt: readFirstText(item, ['description', 'content\\:encoded']),
          imageUrl:
            mediaContent?.getAttribute('url') ?? mediaThumbnail?.getAttribute('url') ?? undefined,
        });
      })
      .filter((item): item is RSSItem => item !== null);
  }

  const atomEntries = Array.from(document.querySelectorAll('feed > entry'));
  return atomEntries
    .map((entry) => {
      const link =
        entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ??
        entry.querySelector('link')?.getAttribute('href') ??
        undefined;
      const title = readFirstText(entry, ['title']);

      if (!link || !title) {
        return null;
      }

      return toRSSItem({
        id: readFirstText(entry, ['id']) ?? link,
        title,
        providerName,
        link,
        fallbackRecentLabel,
        formatRelativeTime,
        publishedAtRaw: readFirstText(entry, ['published', 'updated']),
        excerpt: readFirstText(entry, ['summary', 'content']),
      });
    })
    .filter((item): item is RSSItem => item !== null);
}

export const dedupeItems = (items: RSSItem[]): RSSItem[] =>
  items.filter(
    (item, index, allItems) =>
      allItems.findIndex((candidate) => candidate.url === item.url) === index
  );

export const sortItemsByPublishedAt = (items: RSSItem[]): RSSItem[] =>
  [...items].sort((left, right) => {
    if (typeof left.publishedAtMs === 'number' && typeof right.publishedAtMs === 'number') {
      return right.publishedAtMs - left.publishedAtMs;
    }

    if (typeof left.publishedAtMs === 'number') {
      return -1;
    }

    if (typeof right.publishedAtMs === 'number') {
      return 1;
    }

    return 0;
  });
