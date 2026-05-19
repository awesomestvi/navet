import { Settings2 } from 'lucide-react';
import { BaseCard, RoundControlButton } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { type ThemeType, useI18n } from '@/app/hooks';
import { RSSArticleListLarge, RSSArticleListMedium, RSSArticleListSmall } from './rss-article-list';
import { RSSEmptyState } from './rss-empty-state';
import { RSSFeedLoadingSkeleton } from './rss-loading-skeleton';
import { RSSProviderFilterPills } from './rss-provider-filter-pills';
import { getRSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSItem, RSSProvider } from './types';

interface RSSFeedCardViewProps {
  inEditMode?: boolean;
  size?: CardSize;
  onSizeChange?: (size: CardSize) => void;
  theme: ThemeType;
  accentColor: string;
  colors: {
    rss: {
      gradient: string;
      border: string;
      glow: string;
    };
  };
  tintColor?: string;
  isSmall: boolean;
  isMedium: boolean;
  latestArticle: RSSItem | null;
  items: RSSItem[];
  selectedProviders: RSSProvider[];
  activeProviderId: 'all' | string;
  onActiveProviderChange: (providerId: 'all' | string) => void;
  handleArticleClick: (url: string) => void;
  isLoading: boolean;
  error: string | null;
  hasConfiguredProviders: boolean;
  hasSelectedProviders: boolean;
  onOpenSettings: () => void;
}

export function RSSFeedCardView({
  inEditMode = false,
  size = 'large',
  onSizeChange: _onSizeChange,
  theme,
  accentColor,
  colors,
  tintColor,
  isSmall,
  isMedium,
  latestArticle,
  items,
  selectedProviders,
  activeProviderId,
  onActiveProviderChange,
  handleArticleClick,
  isLoading,
  error,
  hasConfiguredProviders,
  hasSelectedProviders,
  onOpenSettings,
}: RSSFeedCardViewProps) {
  const { t } = useI18n();
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, accentColor, tintColor);
  const chromeSize = size === 'large' ? 'medium' : size;
  const hasCustomTint = Boolean(rssSurface.resolvedTintColor);
  const controlAccentColor = rssSurface.resolvedTintColor ?? rssSurface.accentColor.base;
  const isEmpty = !latestArticle && !isLoading;

  return (
    <BaseCard
      size={size}
      className={`
        group transition-all duration-300
        ${rssSurface.containerShadowClassName}
        ${!inEditMode ? 'cursor-default' : ''}
      `}
      frameClassName={`${rssSurface.surface.panel} ${!hasCustomTint ? colors.rss.border : ''}`}
      style={rssSurface.cardStyle}
      disableDefaultSheen
      disableDefaultLightOverlay
      overlay={
        <>
          {rssSurface.glowStyle ? (
            <div className="absolute inset-0" style={rssSurface.glowStyle} />
          ) : null}
          <div className={`absolute inset-0 ${rssSurface.overlayClassName}`} />
          {!hasCustomTint ? (
            <>
              <div
                className={`absolute inset-0 bg-linear-to-br ${colors.rss.gradient} opacity-45`}
              />
              <div
                className={`absolute inset-0 bg-linear-to-br ${colors.rss.glow} to-transparent opacity-65`}
              />
              {rssSurface.surface.lightOverlay ? (
                <div className={`absolute inset-0 ${rssSurface.surface.lightOverlay}`} />
              ) : null}
            </>
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      <div className="relative flex h-full flex-col">
        {isEmpty ? (
          <RSSEmptyState
            hasConfiguredProviders={hasConfiguredProviders}
            hasSelectedProviders={hasSelectedProviders}
            error={error}
            inEditMode={inEditMode}
            rssSurface={rssSurface}
            onOpenSettings={onOpenSettings}
          />
        ) : isLoading && !latestArticle ? (
          <RSSFeedLoadingSkeleton
            isSmall={isSmall}
            isMedium={isMedium}
            theme={theme}
            accentColor={controlAccentColor}
          />
        ) : (
          <>
            <div className="mb-2 flex items-start gap-2">
              <RSSProviderFilterPills
                selectedProviders={selectedProviders}
                activeProviderId={activeProviderId}
                onActiveProviderChange={onActiveProviderChange}
                rssSurface={rssSurface}
                controlAccentColor={controlAccentColor}
                theme={theme}
              />
              <RoundControlButton
                theme={theme}
                size={chromeSize === 'small' ? 'small' : 'medium'}
                variant="soft"
                aria-label={t('rss.configureProviders')}
                className="shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenSettings();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </RoundControlButton>
            </div>

            {isSmall && latestArticle ? (
              <RSSArticleListSmall
                items={items}
                inEditMode={inEditMode}
                rssSurface={rssSurface}
                handleArticleClick={handleArticleClick}
              />
            ) : isMedium ? (
              <RSSArticleListMedium
                items={items}
                inEditMode={inEditMode}
                rssSurface={rssSurface}
                handleArticleClick={handleArticleClick}
              />
            ) : (
              <RSSArticleListLarge
                items={items}
                inEditMode={inEditMode}
                rssSurface={rssSurface}
                handleArticleClick={handleArticleClick}
              />
            )}
          </>
        )}
      </div>
    </BaseCard>
  );
}
