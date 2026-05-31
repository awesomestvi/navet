import { useI18n } from '@navet/app/hooks';
import type { PlatformEntitySnapshotMap } from '@navet/app/platform/provider-feature-models';
import { useEffect, useMemo, useState } from 'react';
import {
  deleteCachedEntry,
  getCachedEntry,
  getProviderCacheKey,
  setCachedEntry,
} from './rss-feed-cache';
import { fetchUrlProviderItems, getHomeAssistantProviderItems } from './rss-feed-fetcher';
import { dedupeItems, sortItemsByPublishedAt } from './rss-feed-parser';
import type { RSSItem, RSSProvider } from './types';

type RSSFeedLoadResult = {
  items: RSSItem[];
  error: string | null;
};

const inFlightRequests = new Map<string, Promise<RSSFeedLoadResult>>();

export function useRSSFeedItems(
  providers: RSSProvider[],
  entities: PlatformEntitySnapshotMap | null,
  limit = 10,
  refreshNonce = 0
) {
  const { formatRelativeTime, t } = useI18n();
  const cacheKey = useMemo(
    () => `${providers.map(getProviderCacheKey).join('|')}::${limit}`,
    [limit, providers]
  );
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
      deleteCachedEntry(cacheKey);
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    if (refreshNonce > 0) {
      deleteCachedEntry(cacheKey);
    }

    const loadItems = async () => {
      const existingCachedEntry = refreshNonce > 0 ? null : getCachedEntry(cacheKey);
      if (existingCachedEntry) {
        setItems(existingCachedEntry.items);
        setError(existingCachedEntry.error);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let request = inFlightRequests.get(cacheKey);
        if (!request) {
          request = Promise.allSettled(
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
          ).then((results) => {
            const nextItems = sortItemsByPublishedAt(
              dedupeItems(
                results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
              )
            ).slice(0, limit);

            const failedResults = results.filter((result) => result.status === 'rejected');
            const nextError =
              nextItems.length === 0 && failedResults.length > 0
                ? t('rss.error.unableToLoad')
                : null;

            setCachedEntry(cacheKey, nextItems, nextError);

            return { items: nextItems, error: nextError };
          });

          inFlightRequests.set(cacheKey, request);
          request.finally(() => {
            if (inFlightRequests.get(cacheKey) === request) {
              inFlightRequests.delete(cacheKey);
            }
          });
        }

        const result = await request;

        if (cancelled) {
          return;
        }

        setItems(result.items);
        setError(result.error);
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
