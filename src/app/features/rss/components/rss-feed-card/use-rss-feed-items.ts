import type { HassEntities } from 'home-assistant-js-websocket';
import { useEffect, useState } from 'react';
import { useI18n } from '@/app/hooks';
import type { RSSItem, RSSProvider } from './types';

const RSS_PROXY_PATH = '__navet_rss_proxy__';
const RSS_SUCCESS_CACHE_TTL_MS = 120_000;
const RSS_ERROR_CACHE_TTL_MS = 15_000;
const RSS_CACHE_MAX_SIZE = 50; // Maximum number of entries to prevent memory growth

type RSSFeedItemsCacheEntry = {
  items: RSSItem[];
  error: string | null;
  createdAt: number;
  lastAccessedAt: number;
};

const rssFeedItemsCache = new Map<string, RSSFeedItemsCacheEntry>();

/**
 * Evict least recently used entries when cache exceeds max size.
 * Called before adding new entries to maintain cache size limit.
 */
function evictCacheIfNeeded() {
  if (rssFeedItemsCache.size <= RSS_CACHE_MAX_SIZE) {
    return;
  }

  // Convert to array and sort by lastAccessedAt to find LRU entries
  const entries = Array.from(rssFeedItemsCache.entries()).sort(
    (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
  );

  // Remove oldest 20% of entries to avoid frequent evictions
  const entriesToRemove = Math.max(1, Math.floor(RSS_CACHE_MAX_SIZE * 0.2));
  for (let i = 0; i < entriesToRemove; i++) {
    rssFeedItemsCache.delete(entries[i][0]);
  }
}

function getProviderCacheKey(provider: RSSProvider) {
  return [
    provider.id,
    provider.name,
    provider.type,
    provider.feedUrl ?? '',
    provider.entityId ?? '',
  ].join('::');
}

function getCachedEntry(cacheKey: string): RSSFeedItemsCacheEntry | null {
  const cachedEntry = rssFeedItemsCache.get(cacheKey);
  if (!cachedEntry) {
    return null;
  }

  const maxAge = cachedEntry.error ? RSS_ERROR_CACHE_TTL_MS : RSS_SUCCESS_CACHE_TTL_MS;
  if (Date.now() - cachedEntry.createdAt > maxAge) {
    rssFeedItemsCache.delete(cacheKey);
    return null;
  }

  // Update last accessed time for LRU tracking
  cachedEntry.lastAccessedAt = Date.now();
  rssFeedItemsCache.set(cacheKey, cachedEntry);

  return cachedEntry;
}

function getRSSProxyRequestUrl(feedUrl: string) {
  const baseUrl =
    typeof document !== 'undefined' && document.baseURI
      ? document.baseURI
      : typeof window !== 'undefined'
        ? window.location.href
        : '/';
  const proxyUrl = new URL(RSS_PROXY_PATH, baseUrl);
  proxyUrl.searchParams.set('url', feedUrl);
  return proxyUrl.toString();
}

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

const toRSSItem = ({
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
}): RSSItem => {
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
    url: link,
    excerpt: excerpt ? stripHtml(excerpt) : undefined,
    imageUrl,
    publishedAtMs: hasValidPublishedAt ? publishedAtMs : undefined,
  };
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

const parseRSSDocument = (
  xml: string,
  providerName: string,
  fallbackRecentLabel: string,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
): RSSItem[] => {
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
};

async function fetchUrlProviderItems(
  provider: RSSProvider,
  fallbackRecentLabel: string,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
): Promise<RSSItem[]> {
  if (!provider.feedUrl) {
    return [];
  }

  const response = await fetch(getRSSProxyRequestUrl(provider.feedUrl), {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`unable-to-load:${provider.name}`);
  }

  const xml = await response.text();
  return parseRSSDocument(xml, provider.name, fallbackRecentLabel, formatRelativeTime);
}

function getHomeAssistantProviderItems(
  provider: RSSProvider,
  entities: HassEntities | null,
  fallbackRecentLabel: string,
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
): RSSItem[] {
  if (provider.type !== 'home-assistant-feedreader' || !provider.entityId || !entities) {
    return [];
  }

  const entity = entities[provider.entityId];
  if (!entity) {
    return [];
  }

  const attributes = entity.attributes as Record<string, unknown> | undefined;
  const link = typeof attributes?.link === 'string' ? attributes.link : undefined;
  const title =
    (typeof attributes?.title === 'string' && attributes.title) ||
    (typeof attributes?.friendly_name === 'string' && attributes.friendly_name) ||
    undefined;

  if (!link || !title) {
    return [];
  }

  return [
    toRSSItem({
      id: provider.entityId,
      title,
      providerName: provider.name,
      link,
      fallbackRecentLabel,
      formatRelativeTime,
      publishedAtRaw:
        (typeof attributes?.published === 'string' && attributes.published) ||
        (typeof attributes?.pubDate === 'string' && attributes.pubDate) ||
        (typeof attributes?.updated === 'string' && attributes.updated) ||
        undefined,
      excerpt:
        (typeof attributes?.summary === 'string' && attributes.summary) ||
        (typeof attributes?.description === 'string' && attributes.description) ||
        undefined,
      imageUrl:
        (typeof attributes?.image === 'string' && attributes.image) ||
        (typeof attributes?.entity_picture === 'string' && attributes.entity_picture) ||
        undefined,
    }),
  ];
}

const dedupeItems = (items: RSSItem[]): RSSItem[] =>
  items.filter(
    (item, index, allItems) =>
      allItems.findIndex((candidate) => candidate.url === item.url) === index
  );

const sortItemsByPublishedAt = (items: RSSItem[]): RSSItem[] =>
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

export function useRSSFeedItems(
  providers: RSSProvider[],
  entities: HassEntities | null,
  limit = 10,
  refreshNonce = 0
) {
  const { formatRelativeTime, t } = useI18n();
  const cacheKey = `${providers.map(getProviderCacheKey).join('|')}::${limit}`;
  const cachedEntry = getCachedEntry(cacheKey);
  const [items, setItems] = useState<RSSItem[]>(() => cachedEntry?.items ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => cachedEntry?.error ?? null);

  useEffect(() => {
    const nextCachedEntry = getCachedEntry(cacheKey);
    setItems(nextCachedEntry?.items ?? []);
    setError(nextCachedEntry?.error ?? null);
  }, [cacheKey]);

  useEffect(() => {
    if (providers.length === 0) {
      rssFeedItemsCache.delete(cacheKey);
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    if (refreshNonce > 0) {
      rssFeedItemsCache.delete(cacheKey);
    }

    const loadItems = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          providers.map((provider) =>
            provider.type === 'home-assistant-feedreader'
              ? Promise.resolve(
                  getHomeAssistantProviderItems(
                    provider,
                    entities,
                    t('rss.recently'),
                    formatRelativeTime
                  )
                )
              : fetchUrlProviderItems(provider, t('rss.recently'), formatRelativeTime)
          )
        );

        if (cancelled) {
          return;
        }

        const nextItems = sortItemsByPublishedAt(
          dedupeItems(
            results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
          )
        ).slice(0, limit);

        const failedResults = results.filter((result) => result.status === 'rejected');

        const nextError =
          nextItems.length === 0 && failedResults.length > 0 ? t('rss.error.unableToLoad') : null;

        // Evict old entries before adding new one to prevent unbounded growth
        evictCacheIfNeeded();

        rssFeedItemsCache.set(cacheKey, {
          items: nextItems,
          error: nextError,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        });
        setItems(nextItems);
        setError(nextError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, entities, formatRelativeTime, limit, providers, refreshNonce, t]);

  const latestArticle = items[0] ?? null;

  return {
    items,
    latestArticle,
    isLoading,
    error,
  };
}
