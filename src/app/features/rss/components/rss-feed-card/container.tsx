import type { HassEntities } from 'home-assistant-js-websocket';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { shallow } from 'zustand/shallow';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { HOME_WIDGET_ROOM } from '@/app/features/dashboard';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { useDevices, useRooms } from '@/app/hooks/use-devices';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSFeedCardProps } from './types';
import { useRSSFeedItems } from './use-rss-feed-items';
import { useRSSFeedSources } from './use-rss-feed-sources';
import { RSSFeedCardView } from './view';

const RSS_REFRESH_INTERVAL_SECONDS = 120;
const EMPTY_FEEDREADER_ENTITIES: HassEntities = {};

export const RSSFeedCardContainer = memo(function RSSFeedCardContainer({
  cardId,
  inEditMode = false,
  size = 'medium',
  onSizeChange,
  room,
  onRoomChange,
  data,
  onDataChange,
  tintColor,
  onTintColorChange,
}: RSSFeedCardProps) {
  const { theme, colors, primaryColor } = useTheme();
  const { t, formatRelativeTime } = useI18n();
  const allDevices = useDevices();
  const rooms = useRooms(allDevices);
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const primaryColorValue = getThemeColorValue(primaryColor);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<'all' | string>('all');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [, setSecondsUntilRefresh] = useState(RSS_REFRESH_INTERVAL_SECONDS);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const {
    providers,
    selectedProviders,
    selectedProviderIds,
    setSelectedProviderIds,
    addProvider,
    removeProvider,
    homeAssistantProviders,
    articleCount,
    setArticleCount,
  } = useRSSFeedSources(cardId, data, onDataChange);

  // Only subscribe to the specific entity IDs used by HA feedreader providers.
  // useRSSFeedItems accesses entities[provider.entityId] — never the full dict.
  // Without narrowing, any HA entity update would re-trigger the RSS fetch effect.
  const feedreaderEntityIds = useMemo(
    () =>
      selectedProviders
        .filter((p) => p.type === 'home-assistant-feedreader' && p.entityId)
        .map((p) => p.entityId as string),
    [selectedProviders]
  );

  const feedreaderEntitySelector = useCallback(
    (state: HomeAssistantStore): HassEntities => {
      if (!feedreaderEntityIds.length || !state.entities) return EMPTY_FEEDREADER_ENTITIES;
      return Object.fromEntries(
        feedreaderEntityIds.map((eid) => [eid, state.entities?.[eid]])
      ) as HassEntities;
    },
    [feedreaderEntityIds]
  );
  const feedreaderEntities = useHomeAssistant(feedreaderEntitySelector, shallow);

  const { items, isLoading, error } = useRSSFeedItems(
    selectedProviders,
    feedreaderEntities,
    articleCount,
    refreshNonce
  );
  const providerSelectionKey = selectedProviderIds.join('|');

  useEffect(() => {
    void providerSelectionKey;
    setActiveProviderId('all');
  }, [providerSelectionKey]);

  useEffect(() => {
    if (!isLoading && !error) {
      setLastUpdatedAt(new Date());
    }
  }, [error, isLoading]);

  useEffect(() => {
    void providerSelectionKey;
    setSecondsUntilRefresh(RSS_REFRESH_INTERVAL_SECONDS);

    const intervalId = window.setInterval(() => {
      setSecondsUntilRefresh((current) => {
        if (current <= 1) {
          setRefreshNonce((value) => value + 1);
          return RSS_REFRESH_INTERVAL_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [providerSelectionKey]);

  const filteredItems = useMemo(() => {
    if (activeProviderId === 'all') {
      return items;
    }

    const activeProvider = selectedProviders.find((provider) => provider.id === activeProviderId);
    if (!activeProvider) {
      return items;
    }

    return items.filter((item) => item.source === activeProvider.name);
  }, [activeProviderId, items, selectedProviders]);

  const filteredLatestArticle = filteredItems[0] ?? null;
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) {
      return t('rss.recently');
    }

    const diffMinutes = Math.max(0, Math.round((Date.now() - lastUpdatedAt.getTime()) / 60000));

    if (diffMinutes < 1) {
      return t('rss.recently');
    }

    if (diffMinutes < 60) {
      return formatRelativeTime(-diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return formatRelativeTime(-diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return formatRelativeTime(-diffDays, 'day');
  }, [formatRelativeTime, lastUpdatedAt, t]);

  const handleRefetch = () => {
    setRefreshNonce((value) => value + 1);
    setSecondsUntilRefresh(RSS_REFRESH_INTERVAL_SECONDS);
  };

  const handleArticleClick = (url: string) => {
    if (!inEditMode) {
      window.open(url, '_blank');
    }
  };

  const roomValue = room === 'All' || !room ? HOME_WIDGET_ROOM : room;
  const roomLabel = roomValue === HOME_WIDGET_ROOM ? t('dashboard.roomNav.all') : roomValue;
  const roomOptions = [
    { label: t('dashboard.roomNav.all'), value: HOME_WIDGET_ROOM },
    ...rooms.map((entry) => ({ label: entry, value: entry })),
  ];

  return (
    <>
      <RSSFeedCardView
        inEditMode={inEditMode}
        size={size}
        onSizeChange={onSizeChange}
        theme={theme}
        primaryColor={primaryColor}
        colors={colors}
        tintColor={tintColor}
        isSmall={isSmall}
        isMedium={isMedium}
        latestArticle={filteredLatestArticle}
        items={filteredItems}
        selectedProviders={selectedProviders}
        activeProviderId={activeProviderId}
        onActiveProviderChange={setActiveProviderId}
        handleArticleClick={handleArticleClick}
        isLoading={isLoading}
        error={error}
        hasConfiguredProviders={providers.length > 0}
        hasSelectedProviders={selectedProviderIds.length > 0}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefetch={handleRefetch}
        lastUpdatedLabel={lastUpdatedLabel}
      />
      {isSettingsOpen ? (
        <RSSFeedSettingsDialog
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          title={t('rss.title')}
          roomValue={roomValue}
          roomLabel={roomLabel}
          roomOptions={roomOptions}
          theme={theme}
          primaryColorValue={primaryColorValue}
          providers={providers}
          homeAssistantProviders={homeAssistantProviders}
          selectedProviderIds={selectedProviderIds}
          onSelectedProviderIdsChange={setSelectedProviderIds}
          onAddProvider={(name, feedUrl) => {
            try {
              new URL(feedUrl);
            } catch {
              toast.error(t('rss.feedback.invalidUrl'));
              return false;
            }

            const nextProvider = addProvider(name, feedUrl);
            if (!nextProvider) {
              toast.error(t('rss.feedback.addNameAndUrl'));
              return false;
            }

            toast.success(t('rss.feedback.addedProvider', { name: nextProvider.name }));
            return true;
          }}
          onRemoveProvider={(providerId) => {
            const provider = providers.find((candidate) => candidate.id === providerId);
            removeProvider(providerId);
            if (provider) {
              toast.success(t('rss.feedback.removedProvider', { name: provider.name }));
            }
          }}
          articleCount={articleCount}
          onArticleCountChange={setArticleCount}
          onRoomChange={onRoomChange}
          tintColor={tintColor}
          onTintColorChange={onTintColorChange}
        />
      ) : null}
    </>
  );
});
