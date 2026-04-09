import { MoreHorizontal, RefreshCw, Settings2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { InteractivePill } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { withTintAlpha } from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import { type PrimaryColor, type ThemeType, useI18n } from '@/app/hooks';
import { getRSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSItem, RSSProvider } from './types';

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
  selectedProviders: RSSProvider[];
  activeProviderId: 'all' | string;
  onActiveProviderChange: (providerId: 'all' | string) => void;
  handleArticleClick: (url: string) => void;
  isLoading: boolean;
  error: string | null;
  hasConfiguredProviders: boolean;
  hasSelectedProviders: boolean;
  onOpenSettings: () => void;
  onRefetch: () => void;
  lastUpdatedLabel: string;
}

export function RSSFeedCardView({
  inEditMode = false,
  size: _size,
  onSizeChange: _onSizeChange,
  theme,
  primaryColor,
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
  onRefetch,
  lastUpdatedLabel,
}: RSSFeedCardViewProps) {
  const { t } = useI18n();
  const cardShell = getCardShellSurfaceTokens(theme);
  const rssSurface = getRSSFeedCardSurfaceTokens(theme, primaryColor, tintColor);
  const hasCustomTint = Boolean(rssSurface.resolvedTintColor);
  const controlAccentColor = rssSurface.resolvedTintColor ?? rssSurface.accentColor.base;
  const dropdownItemClassName = cn(
    'rounded-xl border border-transparent px-3 py-2 text-sm outline-none transition-colors',
    'data-[highlighted]:bg-[var(--menu-hover-bg)] data-[highlighted]:border-[var(--menu-hover-border)]',
    'focus:bg-[var(--menu-hover-bg)] focus:border-[var(--menu-hover-border)]'
  );
  const dropdownItemHoverStyle = {
    '--menu-hover-bg':
      theme === 'light'
        ? withTintAlpha(controlAccentColor, 0.12)
        : theme === 'glass'
          ? withTintAlpha(controlAccentColor, 0.16)
          : withTintAlpha(controlAccentColor, 0.2),
    '--menu-hover-border':
      theme === 'light'
        ? withTintAlpha(controlAccentColor, 0.24)
        : theme === 'glass'
          ? withTintAlpha(controlAccentColor, 0.32)
          : withTintAlpha(controlAccentColor, 0.38),
  } as CSSProperties;
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
      <div className="relative flex h-full flex-col p-3">
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
        ) : (
          <>
            <div className="mb-2 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex gap-1 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <InteractivePill
                    active={activeProviderId === 'all'}
                    size="compact"
                    className="shrink-0 border-white/8 text-[11px]"
                    style={getRSSControlPillStyle({
                      accentColor: controlAccentColor,
                      isActive: activeProviderId === 'all',
                      theme,
                      textPrimaryColor: rssSurface.textPrimaryColor,
                      textSecondaryColor: rssSurface.textSecondaryColor,
                    })}
                    onClick={(event) => {
                      event.stopPropagation();
                      onActiveProviderChange('all');
                    }}
                  >
                    {t('rss.filter.all')}
                  </InteractivePill>
                  {selectedProviders.map((provider) => (
                    <InteractivePill
                      key={provider.id}
                      active={activeProviderId === provider.id}
                      size="compact"
                      className="shrink-0 border-white/8 text-[11px]"
                      style={getRSSControlPillStyle({
                        accentColor: controlAccentColor,
                        isActive: activeProviderId === provider.id,
                        theme,
                        textPrimaryColor: rssSurface.textPrimaryColor,
                        textSecondaryColor: rssSurface.textSecondaryColor,
                      })}
                      onClick={(event) => {
                        event.stopPropagation();
                        onActiveProviderChange(provider.id);
                      }}
                    >
                      {getCompactProviderLabel(provider.name)}
                    </InteractivePill>
                  ))}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <InteractivePill
                    active
                    intent="action"
                    size="compact"
                    aria-label={t('rss.menu.label')}
                    className="shrink-0 px-1.5"
                    style={getRSSOverflowTriggerStyle({
                      accentColor: controlAccentColor,
                      textPrimaryColor: rssSurface.textPrimaryColor,
                      theme,
                    })}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </InteractivePill>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={cn(getThemeDropdownSurfaceClasses(theme), 'min-w-40 rounded-2xl p-2')}
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem
                    className={dropdownItemClassName}
                    style={dropdownItemHoverStyle}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRefetch();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('rss.refreshNow')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={dropdownItemClassName}
                    style={dropdownItemHoverStyle}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenSettings();
                    }}
                  >
                    <Settings2 className="h-4 w-4" />
                    {t('rss.configureProviders')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isSmall && latestArticle ? (
              // Small: compact headline list
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="space-y-1.5 pr-1">
                  {items.slice(0, 4).map((item, index) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group/item -m-1 block min-w-0 rounded-lg px-1 py-1 text-left no-underline transition-colors ${
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
                        className="text-left text-[10px] font-semibold leading-[1.3] line-clamp-2"
                        style={{ color: rssSurface.textPrimaryColor }}
                      >
                        {item.title}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-none">
                        <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
                        <span className={rssSurface.dotClassName}>•</span>
                        <span style={{ color: rssSurface.textSecondaryColor }}>{item.timeAgo}</span>
                      </div>
                      {index < Math.min(items.length, 4) - 1 ? (
                        <div className={`mt-1.5 h-px ${rssSurface.dividerClassName}`} />
                      ) : null}
                    </a>
                  ))}
                </div>
              </div>
            ) : isMedium ? (
              // Medium: compact list, scrollable
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
                        className="mb-0.5 text-left text-[10px] font-semibold leading-[1.3] line-clamp-2 transition-colors"
                        style={{ color: rssSurface.textPrimaryColor }}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] leading-none">
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
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="space-y-2 pr-1">
                  {items.map((item, index) => {
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
                            <div className="mb-1 flex items-center gap-1.5 text-[11px]">
                              <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
                              <span className={rssSurface.dotClassName}>•</span>
                              <span style={{ color: rssSurface.textSecondaryColor }}>
                                {item.timeAgo}
                              </span>
                            </div>
                            {item.excerpt ? (
                              <p
                                className={`text-left text-[11px] whitespace-normal wrap-break-word leading-[1.4] ${rssSurface.excerptClassName}`}
                                style={{ color: rssSurface.excerptColor }}
                              >
                                {truncateExcerpt(item.excerpt)}
                              </p>
                            ) : null}
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

            {!isSmall && !isMedium ? (
              <div className="mt-2 flex items-center border-t border-white/8 pt-1.5">
                <div
                  className="min-w-0 truncate text-[10px]"
                  style={{ color: rssSurface.textSecondaryColor }}
                >
                  {t('rss.lastUpdated')}
                  <span
                    className="ml-1.5 text-[11px] font-medium"
                    style={{ color: rssSurface.textPrimaryColor }}
                  >
                    {lastUpdatedLabel}
                  </span>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function getCompactProviderLabel(label: string) {
  const normalized = label.trim();

  if (/^bbc\b/i.test(normalized)) {
    return 'BBC';
  }

  if (normalized.length <= 12) {
    return normalized;
  }

  return normalized.split(/\s+/)[0] ?? normalized;
}

function truncateExcerpt(value: string, maxLength = 300) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getRSSControlPillStyle({
  accentColor,
  isActive,
  theme,
  textPrimaryColor,
  textSecondaryColor,
}: {
  accentColor: string;
  isActive: boolean;
  theme: ThemeType;
  textPrimaryColor: string;
  textSecondaryColor: string;
}): CSSProperties {
  return {
    color: isActive ? textPrimaryColor : textSecondaryColor,
    borderColor: isActive
      ? withTintAlpha(accentColor, theme === 'light' ? 0.28 : 0.24)
      : withTintAlpha(accentColor, theme === 'light' ? 0.18 : 0.14),
    background: isActive
      ? `linear-gradient(180deg, ${withTintAlpha(accentColor, theme === 'light' ? 0.14 : 0.26)} 0%, ${withTintAlpha(accentColor, theme === 'light' ? 0.08 : 0.14)} 100%)`
      : withTintAlpha(accentColor, theme === 'light' ? 0.05 : 0.08),
    boxShadow: isActive
      ? `inset 0 1px 0 ${withTintAlpha(accentColor, theme === 'light' ? 0.16 : 0.22)}, 0 8px 20px -16px ${withTintAlpha(accentColor, theme === 'light' ? 0.2 : 0.34)}`
      : 'none',
  };
}

function getRSSOverflowTriggerStyle({
  accentColor,
  textPrimaryColor,
  theme,
}: {
  accentColor: string;
  textPrimaryColor: string;
  theme: ThemeType;
}): CSSProperties {
  return {
    color: textPrimaryColor,
    borderColor: withTintAlpha(accentColor, theme === 'light' ? 0.24 : 0.18),
    background: `linear-gradient(180deg, ${withTintAlpha(accentColor, theme === 'light' ? 0.1 : 0.22)} 0%, ${withTintAlpha(accentColor, theme === 'light' ? 0.06 : 0.12)} 100%)`,
    boxShadow: `inset 0 1px 0 ${withTintAlpha(accentColor, theme === 'light' ? 0.14 : 0.18)}, 0 12px 28px -22px ${withTintAlpha(accentColor, theme === 'light' ? 0.16 : 0.34)}`,
  };
}
