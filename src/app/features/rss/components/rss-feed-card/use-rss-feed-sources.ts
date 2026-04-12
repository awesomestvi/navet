import { useEffect, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useHomeAssistant } from '@/app/hooks';
import { selectFeedreaderEventEntities } from '@/app/hooks/ha-domain-entity-maps';
import { usePersistedState } from '@/app/hooks/use-persisted-state';
import { DEFAULT_RSS_PROVIDERS } from './providers';
import type { RSSProvider } from './types';

const DEFAULT_PROVIDER_ID = 'bbc-world';

const toProviderId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function useRSSFeedSources(cardId: string) {
  const feedreaderEntities = useHomeAssistant(selectFeedreaderEventEntities, shallow);
  const [customProviders, setCustomProviders] = usePersistedState<RSSProvider[]>(
    STORAGE_KEYS.rssFeedProviders,
    DEFAULT_RSS_PROVIDERS
  );
  const [providerSelectionByCardId, setProviderSelectionByCardId] = usePersistedState<
    Record<string, string[]>
  >(STORAGE_KEYS.rssCardProviders, {});

  const [articleCountByCardId, setArticleCountByCardId] = usePersistedState<Record<string, number>>(
    STORAGE_KEYS.rssCardArticleCount,
    {}
  );
  useEffect(() => {
    if (customProviders.length === 0) {
      setCustomProviders(DEFAULT_RSS_PROVIDERS);
    }
  }, [customProviders.length, setCustomProviders]);

  const articleCount = articleCountByCardId[cardId] ?? 10;
  const setArticleCount = (count: number) => {
    setArticleCountByCardId((current) => ({ ...current, [cardId]: count }));
  };

  const homeAssistantProviders = useMemo<RSSProvider[]>(() => {
    return Object.entries(feedreaderEntities)
      .map(([entityId, entity]) => {
        const attributes = entity.attributes as Record<string, unknown> | undefined;

        return {
          id: `ha:${entityId}`,
          name:
            (typeof attributes?.friendly_name === 'string' && attributes.friendly_name) ||
            (typeof attributes?.title === 'string' && attributes.title) ||
            entityId,
          type: 'home-assistant-feedreader' as const,
          entityId,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [feedreaderEntities]);

  const providers = useMemo(
    () => [...customProviders, ...homeAssistantProviders],
    [customProviders, homeAssistantProviders]
  );

  const fallbackProviderIds = useMemo(
    () =>
      providers.some((provider) => provider.id === DEFAULT_PROVIDER_ID)
        ? [DEFAULT_PROVIDER_ID]
        : [],
    [providers]
  );

  const selectedProviderIds = useMemo(() => {
    const savedSelection = providerSelectionByCardId[cardId];
    if (savedSelection) {
      const validSelection = savedSelection.filter((providerId) =>
        providers.some((provider) => provider.id === providerId)
      );

      return validSelection.length > 0 ? validSelection : fallbackProviderIds;
    }

    return fallbackProviderIds;
  }, [cardId, fallbackProviderIds, providerSelectionByCardId, providers]);

  const selectedProviders = useMemo(
    () => providers.filter((provider) => selectedProviderIds.includes(provider.id)),
    [providers, selectedProviderIds]
  );

  const setSelectedProviderIds = (nextProviderIds: string[]) => {
    setProviderSelectionByCardId((current) => ({
      ...current,
      [cardId]: nextProviderIds,
    }));
  };

  const addProvider = (name: string, feedUrl: string) => {
    const trimmedName = name.trim();
    const trimmedFeedUrl = feedUrl.trim();
    const baseId = toProviderId(trimmedName || trimmedFeedUrl);

    if (!trimmedName || !trimmedFeedUrl || !baseId) {
      return null;
    }

    const uniqueId = customProviders.some((provider) => provider.id === baseId)
      ? `${baseId}-${Date.now()}`
      : baseId;

    const nextProvider: RSSProvider = {
      id: uniqueId,
      name: trimmedName,
      type: 'url',
      feedUrl: trimmedFeedUrl,
    };

    setCustomProviders((current) => [...current, nextProvider]);
    setProviderSelectionByCardId((current) => ({
      ...current,
      [cardId]: [...new Set([...(current[cardId] ?? selectedProviderIds), nextProvider.id])],
    }));

    return nextProvider;
  };

  const removeProvider = (providerId: string) => {
    setCustomProviders((current) => current.filter((provider) => provider.id !== providerId));
    setProviderSelectionByCardId((current) => ({
      ...current,
      [cardId]: (current[cardId] ?? []).filter((selectedId) => selectedId !== providerId),
    }));
  };

  return {
    providers,
    selectedProviders,
    selectedProviderIds,
    setSelectedProviderIds,
    addProvider,
    removeProvider,
    homeAssistantProviders,
    articleCount,
    setArticleCount,
  };
}
