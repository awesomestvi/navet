import { isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { useAreaRooms, useDashboardWidgetRoomOptions, useI18n, useTheme } from '@navet/app/hooks';
import { sanitizeExternalUrl } from '@navet/app/utils/url-security';
import { memo, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSFeedCardProps } from './types';
import { useRSSFeedItems } from './use-rss-feed-items';
import { useRSSFeedSources } from './use-rss-feed-sources';
import { RSSFeedCardView } from './view';

const RSS_REFRESH_INTERVAL_SECONDS = 120;

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
  openSettingsRequestKey = 0,
}: RSSFeedCardProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const rooms = useAreaRooms();
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<'all' | string>('all');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const {
    providers,
    selectedProviders,
    selectedProviderIds,
    setSelectedProviderIds,
    addProvider,
    removeProvider,
    articleCount,
    setArticleCount,
  } = useRSSFeedSources(cardId, data, onDataChange);

  const { items, isLoading, error } = useRSSFeedItems(
    selectedProviders,
    articleCount,
    refreshNonce
  );
  const providerSelectionKey = selectedProviderIds.join('|');

  useEffect(() => {
    void providerSelectionKey;
    setActiveProviderId('all');
  }, [providerSelectionKey]);

  useEffect(() => {
    void providerSelectionKey;
    const intervalId = window.setInterval(() => {
      setRefreshNonce((value) => value + 1);
    }, RSS_REFRESH_INTERVAL_SECONDS * 1000);

    return () => window.clearInterval(intervalId);
  }, [providerSelectionKey]);

  useEffect(() => {
    if (openSettingsRequestKey > 0) {
      setIsSettingsOpen(true);
    }
  }, [openSettingsRequestKey]);

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

  const handleArticleClick = (url: string) => {
    if (!inEditMode) {
      const safeUrl = sanitizeExternalUrl(url);
      if (safeUrl) {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);

  return (
    <>
      <RSSFeedCardView
        inEditMode={inEditMode}
        size={size}
        onSizeChange={onSizeChange}
        theme={theme}
        accentColor={accentColor}
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
          primaryColorValue={accentColor}
          providers={providers}
          selectedProviderIds={selectedProviderIds}
          onSelectedProviderIdsChange={setSelectedProviderIds}
          onAddProvider={(name, feedUrl) => {
            try {
              new URL(feedUrl);
            } catch (error) {
              console.error('[RSSFeedCard] Invalid feed URL:', error);
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
