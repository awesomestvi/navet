import { ChevronRight, Rss, Settings2 } from 'lucide-react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { type PrimaryColor, type ThemeType, useI18n } from '@/app/hooks';
import { getRSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSItem } from './types';

interface RSSFeedCardViewProps {
  inEditMode?: boolean;
  size?: CardSize;
  onSizeChange?: (size: CardSize) => void;
  theme: ThemeType;
  primaryColor: PrimaryColor;
  colors: {
    rss: {
      gradient: string;
      border: string;
      glow: string;
    };
  };
  isSmall: boolean;
  isMedium: boolean;
  selectedFeedLabel: string;
  latestArticle: RSSItem | null;
  items: RSSItem[];
  handleArticleClick: (url: string) => void;
  isLoading: boolean;
  error: string | null;
  hasConfiguredProviders: boolean;
  hasSelectedProviders: boolean;
  onOpenSettings: () => void;
}

export function RSSFeedCardView({
  inEditMode = false,
  size = 'medium',
  onSizeChange: _onSizeChange,
  theme,
  primaryColor,
  colors,
  isSmall,
  isMedium,
  selectedFeedLabel,
  latestArticle,
  items,
  handleArticleClick,
  isLoading,
  error,
  hasConfiguredProviders,
  hasSelectedProviders,
  onOpenSettings,
}: RSSFeedCardViewProps) {
  const { t } = useI18n();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, primaryColor);
  const isEmpty = !latestArticle && !isLoading;
  const emptyMessage = !hasConfiguredProviders
    ? t('rss.empty.noProviders')
    : !hasSelectedProviders
      ? t('rss.empty.noSelection')
      : error
        ? error
        : t('rss.empty.noArticles');

  return (
    <div
      className={`
        relative group overflow-hidden
        h-full w-full rounded-3xl
        bg-gradient-to-br ${colors.rss.gradient}
        ${cardShell.backdropClassName} border ${colors.rss.border}
        ${rssSurface.containerShadowClassName}
        transition-all duration-300
        ${inEditMode ? 'cursor-move' : 'cursor-default'}
      `}
    >
      {/* Glass overlay */}
      <div className={`absolute inset-0 ${rssSurface.overlayClassName}`} />

      {/* Subtle glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.rss.glow} to-transparent`} />

      {/* Content */}
      <div className="relative h-full flex flex-col p-4">
        {/* Header */}
        <EntityCardHeader
          title={t('rss.title')}
          subtitle={selectedFeedLabel}
          size={size}
          tone="orange"
          titleClassName={surface.textPrimary}
          subtitleClassName={`${surface.textMuted} whitespace-normal break-words leading-relaxed`}
          className="mb-2"
          contentClassName="text-left"
          leading={
            <EntityCardHeaderIcon
              IconComponent={Rss}
              isActive={true}
              size={size}
              tone="orange"
              ariaLabel={t('rss.configureProviders')}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings();
              }}
            />
          }
        />

        {isEmpty ? (
          <div className="flex flex-1 flex-col justify-center text-left">
            <p className={`text-sm font-medium ${rssSurface.surface.textPrimary}`}>
              {t('rss.title')}
            </p>
            <p className={`mt-2 text-sm leading-relaxed ${rssSurface.textSecondaryClassName}`}>
              {emptyMessage}
            </p>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings();
              }}
              className={`mt-4 inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-opacity hover:opacity-70 ${rssSurface.surface.textPrimary} ${rssSurface.hoverClassName}`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t('rss.configureProviders')}
            </button>
          </div>
        ) : isLoading && !latestArticle ? (
          <div className="flex flex-1 flex-col justify-center text-left">
            <p className={`text-sm font-medium ${rssSurface.surface.textPrimary}`}>
              {t('rss.loading.title')}
            </p>
            <p className={`mt-2 text-sm leading-relaxed ${rssSurface.textSecondaryClassName}`}>
              {t('rss.loading.description')}
            </p>
          </div>
        ) : isSmall && latestArticle ? (
          // Small: Single latest article
          <div className="flex-1 flex flex-col justify-between items-start text-left">
            <div className="w-full">
              <h3
                className={`mb-2 text-left text-lg font-semibold leading-tight line-clamp-2 ${rssSurface.surface.textPrimary}`}
              >
                {latestArticle.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <span style={{ color: rssSurface.sourceColor }}>{latestArticle.source}</span>
                <span className={rssSurface.dotClassName}>•</span>
                <span className={rssSurface.textSecondaryClassName}>{latestArticle.timeAgo}</span>
              </div>
            </div>

            <div className={`flex items-center gap-1 text-xs ${rssSurface.readMoreClassName}`}>
              <span>{t('rss.readMore')}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        ) : isMedium ? (
          // Medium: compact list, scrollable
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-3 pr-1">
              {items.map((item, index) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group/item -m-2 block min-w-0 cursor-pointer rounded-lg p-2 text-left no-underline transition-colors ${rssSurface.hoverClassName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleArticleClick(item.url);
                  }}
                >
                  <h3
                    className={`mb-1 text-left text-sm font-semibold leading-tight line-clamp-2 transition-colors ${rssSurface.surface.textPrimary}`}
                  >
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
                    <span className={rssSurface.dotClassName}>•</span>
                    <span className={rssSurface.textSecondaryClassName}>{item.timeAgo}</span>
                  </div>
                  {index < items.length - 1 && (
                    <div className={`mt-3 h-px ${rssSurface.dividerClassName}`} />
                  )}
                </a>
              ))}
            </div>
          </div>
        ) : (
          // Large: articles with images, scrollable
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-2 pr-1">
              {items.map((item, index) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group/item -m-2 block min-w-0 cursor-pointer rounded-xl p-2 text-left no-underline transition-colors ${rssSurface.hoverClassName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleArticleClick(item.url);
                  }}
                >
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <div
                        className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg ${rssSurface.thumbnailClassName}`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-80 group-hover/item:opacity-100 transition-opacity"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <h3
                        className={`mb-1 text-left text-sm font-semibold leading-tight line-clamp-2 transition-colors ${rssSurface.surface.textPrimary}`}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs mb-1">
                        <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
                        <span className={rssSurface.dotClassName}>•</span>
                        <span className={rssSurface.textSecondaryClassName}>{item.timeAgo}</span>
                      </div>
                      {item.excerpt && (
                        <p
                          className={`text-left text-xs whitespace-normal break-words leading-relaxed ${rssSurface.excerptClassName}`}
                        >
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                  </div>
                  {index < items.length - 1 && (
                    <div className={`mt-2 h-px ${rssSurface.dividerClassName}`} />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
