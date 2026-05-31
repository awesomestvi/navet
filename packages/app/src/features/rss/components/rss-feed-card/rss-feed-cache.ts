import type { RSSItem, RSSProvider } from './types';

const RSS_SUCCESS_CACHE_TTL_MS = 120_000;
const RSS_ERROR_CACHE_TTL_MS = 15_000;
const RSS_CACHE_MAX_SIZE = 50;

type RSSFeedItemsCacheEntry = {
  items: RSSItem[];
  error: string | null;
  createdAt: number;
  lastAccessedAt: number;
};

const rssFeedItemsCache = new Map<string, RSSFeedItemsCacheEntry>();

export function evictCacheIfNeeded() {
  if (rssFeedItemsCache.size <= RSS_CACHE_MAX_SIZE) {
    return;
  }

  const entries = Array.from(rssFeedItemsCache.entries()).sort(
    (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
  );

  const entriesToRemove = Math.max(1, Math.floor(RSS_CACHE_MAX_SIZE * 0.2));
  for (let i = 0; i < entriesToRemove; i++) {
    rssFeedItemsCache.delete(entries[i][0]);
  }
}

export function getProviderCacheKey(provider: RSSProvider) {
  return [
    provider.id,
    provider.name,
    provider.type,
    provider.feedUrl ?? '',
    provider.entityId ?? '',
  ].join('::');
}

export function getCachedEntry(cacheKey: string): RSSFeedItemsCacheEntry | null {
  const cachedEntry = rssFeedItemsCache.get(cacheKey);
  if (!cachedEntry) {
    return null;
  }

  const maxAge = cachedEntry.error ? RSS_ERROR_CACHE_TTL_MS : RSS_SUCCESS_CACHE_TTL_MS;
  if (Date.now() - cachedEntry.createdAt > maxAge) {
    rssFeedItemsCache.delete(cacheKey);
    return null;
  }

  cachedEntry.lastAccessedAt = Date.now();
  rssFeedItemsCache.set(cacheKey, cachedEntry);

  return cachedEntry;
}

export function setCachedEntry(cacheKey: string, items: RSSItem[], error: string | null) {
  evictCacheIfNeeded();

  rssFeedItemsCache.set(cacheKey, {
    items,
    error,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
  });
}

export function deleteCachedEntry(cacheKey: string) {
  rssFeedItemsCache.delete(cacheKey);
}

export function clearCache() {
  rssFeedItemsCache.clear();
}
