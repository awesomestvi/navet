import { memo, useState } from 'react';
import { toast } from 'sonner';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { HOME_WIDGET_ROOM } from '@/app/features/dashboard';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { useDevices, useRooms } from '@/app/hooks/use-devices';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSFeedCardProps } from './types';
import { useRSSFeedItems } from './use-rss-feed-items';
import { useRSSFeedSources } from './use-rss-feed-sources';
import { RSSFeedCardView } from './view';

export const RSSFeedCardContainer = memo(function RSSFeedCardContainer({
  cardId,
  inEditMode = false,
  size = 'medium',
  onSizeChange,
  room,
  onRoomChange,
}: RSSFeedCardProps) {
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const { theme, colors, primaryColor } = useTheme();
  const { t } = useI18n();
  const allDevices = useDevices();
  const rooms = useRooms(allDevices);
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const primaryColorValue = getThemeColorValue(primaryColor);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  } = useRSSFeedSources(cardId);
  const { latestArticle, items, isLoading, error } = useRSSFeedItems(
    selectedProviders,
    entities,
    articleCount
  );

  const handleArticleClick = (url: string) => {
    if (!inEditMode) {
      window.open(url, '_blank');
    }
  };

  const roomValue = room === 'All' || !room ? HOME_WIDGET_ROOM : room;
  const roomLabel = roomValue === HOME_WIDGET_ROOM ? t('dashboard.roomNav.all') : roomValue;
  const selectedFeedLabel =
    selectedProviders.length > 0
      ? selectedProviders.map((provider) => provider.name).join(', ')
      : t('rss.title');
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
        isSmall={isSmall}
        isMedium={isMedium}
        selectedFeedLabel={selectedFeedLabel}
        latestArticle={latestArticle}
        items={items}
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
        />
      ) : null}
    </>
  );
});
