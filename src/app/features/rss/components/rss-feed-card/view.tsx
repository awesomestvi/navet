import { ChevronRight, Settings2 } from 'lucide-react';
import { useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
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
  tintColor?: string;
  isSmall: boolean;
  isMedium: boolean;
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
  onSizeChange: _onSizeChange,
  theme,
  primaryColor,
  colors,
  tintColor,
  isSmall,
  isMedium,
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
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string>>(() => new Set());
  const cardShell = getCardShellSurfaceTokens(theme);
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, primaryColor, tintColor);
  const hasCustomTint = Boolean(rssSurface.resolvedTintColor);
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
        ${hasCustomTint ? '' : `bg-linear-to-br ${colors.rss.gradient}`}
        ${cardShell.backdropClassName} border ${hasCustomTint ? '' : colors.rss.border}
        ${rssSurface.containerShadowClassName}
        transition-all duration-300
        ${!inEditMode ? 'cursor-default' : ''}
      `}
      style={rssSurface.cardStyle}
    >
      {/* Glass overlay */}
      {rssSurface.glowStyle ? (
        <div className="absolute inset-0" style={rssSurface.glowStyle} />
      ) : null}
      <div className={`absolute inset-0 ${rssSurface.overlayClassName}`} />
      {!hasCustomTint ? (
        <div className={`absolute inset-0 bg-linear-to-br ${colors.rss.glow} to-transparent`} />
      ) : null}

      {/* Content */}
      <div className="relative h-full flex flex-col p-4">
        <div className="absolute bottom-4 right-4 z-10">
          <EntityCardHeaderIcon
            IconComponent={Settings2}
            isActive={true}
            size={isSmall ? 'small' : isMedium ? 'medium' : 'large'}
            tone="orange"
            baseColor={rssSurface.resolvedTintColor ?? undefined}
            ariaLabel={t('rss.configureProviders')}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenSettings();
            }}
          />
        </div>

        {isEmpty ? (
          <div className="flex flex-1 flex-col justify-center text-left">
            <p
              className={`mt-2 text-sm leading-relaxed ${rssSurface.textSecondaryClassName}`}
              style={{ color: rssSurface.textSecondaryColor }}
            >
              {emptyMessage}
            </p>
            {inEditMode ? (
              <div
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                style={{ color: rssSurface.textPrimaryColor }}
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t('rss.configureProviders')}
              </div>
            ) : (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                className={`mt-4 inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-opacity hover:opacity-70 ${rssSurface.hoverClassName}`}
                style={{ color: rssSurface.textPrimaryColor }}
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t('rss.configureProviders')}
              </button>
            )}
          </div>
        ) : isLoading && !latestArticle ? (
          <div className="flex flex-1 flex-col justify-center text-left">
            <p
              className={`mt-2 text-sm leading-relaxed ${rssSurface.textSecondaryClassName}`}
              style={{ color: rssSurface.textSecondaryColor }}
            >
              {t('rss.loading.description')}
            </p>
          </div>
        ) : isSmall && latestArticle ? (
          // Small: Single latest article
          <div className="flex-1 flex flex-col justify-between items-start text-left">
            <div className="w-full">
              <h3
                className="mb-2 text-left text-lg font-semibold leading-tight line-clamp-2"
                style={{ color: rssSurface.textPrimaryColor }}
              >
                {latestArticle.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <span style={{ color: rssSurface.sourceColor }}>{latestArticle.source}</span>
                <span className={rssSurface.dotClassName}>•</span>
                <span style={{ color: rssSurface.textSecondaryColor }}>
                  {latestArticle.timeAgo}
                </span>
              </div>
            </div>

            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: rssSurface.readMoreColor }}
            >
              <span>{t('rss.readMore')}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        ) : isMedium ? (
          // Medium: compact list, scrollable
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-2 pr-1">
              {items.map((item, index) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group/item -m-1 block min-w-0 rounded-lg px-1 py-1.5 text-left no-underline transition-colors ${
                    inEditMode ? '' : `cursor-pointer ${rssSurface.hoverClassName}`
                  }`}
                  onClick={(e) => {
                    if (inEditMode) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    handleArticleClick(item.url);
                  }}
                >
                  <h3
                    className="mb-0.5 text-left text-[11px] font-semibold leading-3.5 line-clamp-2 transition-colors"
                    style={{ color: rssSurface.textPrimaryColor }}
                  >
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] leading-none">
                    <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
                    <span className={rssSurface.dotClassName}>•</span>
                    <span style={{ color: rssSurface.textSecondaryColor }}>{item.timeAgo}</span>
                  </div>
                  {index < items.length - 1 && (
                    <div className={`mt-2 h-px ${rssSurface.dividerClassName}`} />
                  )}
                </a>
              ))}
            </div>
          </div>
        ) : (
          // Large: articles with images, scrollable
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="space-y-2 pr-1">
              {items.map((item, index) => {
                const isExpanded = expandedArticleIds.has(item.id);
                const collapsedExcerpt =
                  item.excerpt && item.excerpt.length > 110
                    ? `${item.excerpt.slice(0, 107).trimEnd()}...`
                    : item.excerpt;

                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group/item -m-2 block min-w-0 rounded-xl p-2 text-left no-underline transition-colors ${
                      inEditMode ? '' : `cursor-pointer ${rssSurface.hoverClassName}`
                    }`}
                    onClick={(e) => {
                      if (inEditMode) {
                        e.preventDefault();
                        return;
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      handleArticleClick(item.url);
                    }}
                  >
                    <div className="flex gap-3">
                      {item.imageUrl && (
                        <div
                          className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg ${rssSurface.thumbnailClassName}`}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover opacity-80 transition-opacity group-hover/item:opacity-100"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-left">
                        <h3
                          className="mb-1 text-left text-sm font-semibold leading-tight line-clamp-2 transition-colors"
                          style={{ color: rssSurface.textPrimaryColor }}
                        >
                          {item.title}
                        </h3>
                        <div className="mb-1 flex items-center gap-1.5 text-xs">
                          <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
                          <span className={rssSurface.dotClassName}>•</span>
                          <span style={{ color: rssSurface.textSecondaryColor }}>
                            {item.timeAgo}
                          </span>
                        </div>
                        {item.excerpt &&
                          (isExpanded ? (
                            <>
                              <p
                                className={`text-left text-xs whitespace-normal wrap-break-word leading-relaxed ${rssSurface.excerptClassName}`}
                                style={{ color: rssSurface.excerptColor }}
                              >
                                {item.excerpt}
                              </p>
                              {inEditMode ? null : (
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setExpandedArticleIds((current) => {
                                      const next = new Set(current);
                                      next.delete(item.id);
                                      return next;
                                    });
                                  }}
                                  className={`mt-1 inline-flex text-xs font-medium ${rssSurface.readMoreClassName}`}
                                  style={{ color: rssSurface.readMoreColor }}
                                >
                                  {t('rss.showLess')}
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="relative">
                              <p
                                className={`line-clamp-2 pr-20 text-left text-xs whitespace-normal wrap-break-word leading-relaxed ${rssSurface.excerptClassName}`}
                                style={{ color: rssSurface.excerptColor }}
                              >
                                {collapsedExcerpt}
                              </p>
                              {item.excerpt.length > 110 && !inEditMode ? (
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setExpandedArticleIds((current) => {
                                      const next = new Set(current);
                                      next.add(item.id);
                                      return next;
                                    });
                                  }}
                                  className={`absolute bottom-0 right-0 inline cursor-pointer bg-linear-to-r from-transparent via-[rgba(0,0,0,0.0)] to-[rgba(0,0,0,0.0)] pl-4 text-xs font-medium ${rssSurface.readMoreClassName}`}
                                  style={{ color: rssSurface.readMoreColor }}
                                >
                                  {t('rss.readMore')}
                                </button>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    </div>
                    {index < items.length - 1 && (
                      <div className={`mt-2 h-px ${rssSurface.dividerClassName}`} />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
