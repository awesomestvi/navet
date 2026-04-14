import { useEffect, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useHomeAssistant } from '@/app/hooks';
import { selectFeedreaderEventEntities } from '@/app/hooks/ha-domain-entity-maps';
import { usePersistedState } from '@/app/hooks/use-persisted-state';
import { DEFAULT_RSS_PROVIDERS } from './providers';
import type { RSSCardData, RSSProvider } from './types';

const DEFAULT_PROVIDER_ID = 'bbc-world';

const toProviderId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function useRSSFeedSources(
  cardId: string,
  cardData?: RSSCardData,
  onCardDataChange?: (updates: Partial<RSSCardData>) => void
) {
  const feedreaderEntities = useHomeAssistant(selectFeedreaderEventEntities, shallow);
  const [legacyCustomProviders, setLegacyCustomProviders] = usePersistedState<RSSProvider[]>(
    STORAGE_KEYS.rssFeedProviders,
    DEFAULT_RSS_PROVIDERS
  );
  const [legacyProviderSelectionByCardId, setLegacyProviderSelectionByCardId] = usePersistedState<
    Record<string, string[]>
  >(STORAGE_KEYS.rssCardProviders, {});

  const [legacyArticleCountByCardId, setLegacyArticleCountByCardId] = usePersistedState<
    Record<string, number>
  >(STORAGE_KEYS.rssCardArticleCount, {});
  const customProviders = cardData?.customProviders ?? legacyCustomProviders;
  useEffect(() => {
    if (customProviders.length === 0) {
      if (onCardDataChange) {
        onCardDataChange({ customProviders: DEFAULT_RSS_PROVIDERS });
        return;
      }

      setLegacyCustomProviders(DEFAULT_RSS_PROVIDERS);
    }
  }, [customProviders.length, onCardDataChange, setLegacyCustomProviders]);

  const articleCount = cardData?.articleCount ?? legacyArticleCountByCardId[cardId] ?? 10;
  const setArticleCount = (count: number) => {
    if (onCardDataChange) {
      onCardDataChange({ articleCount: count });
      return;
    }

    setLegacyArticleCountByCardId((current) => ({ ...current, [cardId]: count }));
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
    const savedSelection = cardData?.selectedProviderIds ?? legacyProviderSelectionByCardId[cardId];
    if (savedSelection) {
      const validSelection = savedSelection.filter((providerId) =>
        providers.some((provider) => provider.id === providerId)
      );

      return validSelection.length > 0 ? validSelection : fallbackProviderIds;
    }

    return fallbackProviderIds;
  }, [
    cardData?.selectedProviderIds,
    cardId,
    fallbackProviderIds,
    legacyProviderSelectionByCardId,
    providers,
  ]);

  const selectedProviders = useMemo(
    () => providers.filter((provider) => selectedProviderIds.includes(provider.id)),
    [providers, selectedProviderIds]
  );

  const setSelectedProviderIds = (nextProviderIds: string[]) => {
    if (onCardDataChange) {
      onCardDataChange({ selectedProviderIds: nextProviderIds });
      return;
    }

    setLegacyProviderSelectionByCardId((current) => ({
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

    const nextSelectedProviderIds = [...new Set([...selectedProviderIds, nextProvider.id])];

    if (onCardDataChange) {
      onCardDataChange({
        customProviders: [...customProviders, nextProvider],
        selectedProviderIds: nextSelectedProviderIds,
      });
    } else {
      setLegacyCustomProviders((current) => [...current, nextProvider]);
      setLegacyProviderSelectionByCardId((current) => ({
        ...current,
        [cardId]: [...new Set([...(current[cardId] ?? selectedProviderIds), nextProvider.id])],
      }));
    }

    return nextProvider;
  };

  const removeProvider = (providerId: string) => {
    if (onCardDataChange) {
      onCardDataChange({
        customProviders: customProviders.filter((provider) => provider.id !== providerId),
        selectedProviderIds: selectedProviderIds.filter((selectedId) => selectedId !== providerId),
      });
      return;
    }

    setLegacyCustomProviders((current) => current.filter((provider) => provider.id !== providerId));
    setLegacyProviderSelectionByCardId((current) => ({
      ...current,
      [cardId]: (current[cardId] ?? []).filter((selectedId) => selectedId !== providerId),
    }));
  };

  useEffect(() => {
    if (!onCardDataChange) {
      return;
    }

    const migrationUpdates: Partial<RSSCardData> = {};

    if (cardData?.customProviders === undefined && legacyCustomProviders.length > 0) {
      migrationUpdates.customProviders = legacyCustomProviders;
    }

    if (
      cardData?.selectedProviderIds === undefined &&
      legacyProviderSelectionByCardId[cardId] !== undefined
    ) {
      migrationUpdates.selectedProviderIds = legacyProviderSelectionByCardId[cardId];
    }

    if (cardData?.articleCount === undefined && legacyArticleCountByCardId[cardId] !== undefined) {
      migrationUpdates.articleCount = legacyArticleCountByCardId[cardId];
    }

    if (Object.keys(migrationUpdates).length > 0) {
      onCardDataChange(migrationUpdates);
    }
  }, [
    cardData?.articleCount,
    cardData?.customProviders,
    cardData?.selectedProviderIds,
    cardId,
    legacyArticleCountByCardId,
    legacyCustomProviders,
    legacyProviderSelectionByCardId,
    onCardDataChange,
  ]);

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
