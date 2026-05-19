import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Header } from '@/app/components/layout/header';
import { Sidebar } from '@/app/components/layout/sidebar';
import { useHeaderController } from '@/app/components/layout/use-header-controller';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { type PrimaryColor, type ThemeType, useTheme } from '@/app/hooks';
import { isHomeAssistantAddonMode } from '@/app/runtime/app-mode';
import { useSettingsStore } from '@/app/stores';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { storage } from '@/app/utils/storage';
import { sanitizeExternalUrl } from '@/app/utils/url-security';
import type { DashboardLayoutProps } from './types';

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\(([^)]+)\)/;
const CUSTOM_PANEL_TOPBAR_ENABLED = true;
const CUSTOM_PANEL_TOPBAR_DISMISSED_AT_KEY = 'navet:custom-panel-topbar-dismissed-at';
const CUSTOM_PANEL_TOPBAR_DISMISS_MS = 6 * 60 * 60 * 1000;

function CustomPanelTopbar({
  dismissLabel,
  message,
  onDismiss,
  primaryColor,
  title,
  theme,
}: {
  dismissLabel: string;
  message: string;
  onDismiss: () => void;
  primaryColor: PrimaryColor;
  title: string;
  theme: ThemeType;
}) {
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const linkMatch = message.match(MARKDOWN_LINK_PATTERN);
  const linkStart = linkMatch?.index ?? -1;
  const hasLink = Boolean(linkMatch && linkStart >= 0);
  const linkLabel = linkMatch?.[1] ?? '';
  const linkHref = hasLink ? sanitizeExternalUrl(linkMatch?.[2]) : null;
  const beforeLink = hasLink
    ? message
        .slice(0, linkStart)
        .replace('The Home Assistant add-on will be phased out gradually. ', '')
        .trimEnd()
    : message;
  const afterLink = hasLink && linkMatch ? message.slice(linkStart + linkMatch[0].length) : '';
  const barClassName = cn(
    'fixed inset-x-0 top-0 z-[70] border-b',
    surface.shellPanel,
    theme === 'glass' || theme === 'light' ? 'backdrop-blur-xl' : '',
    theme === 'light'
      ? 'shadow-[0_10px_30px_-24px_rgba(15,23,42,0.28)]'
      : theme === 'black'
        ? 'shadow-none'
        : 'shadow-[0_18px_48px_-34px_rgba(0,0,0,0.68)]'
  );
  const iconBackground =
    theme === 'light'
      ? `${accentColor}14`
      : theme === 'black'
        ? `${accentColor}22`
        : `${accentColor}26`;
  const iconBorder = theme === 'light' ? `${accentColor}38` : `${accentColor}44`;

  return (
    <div
      className={barClassName}
      style={{
        boxShadow:
          theme === 'black'
            ? undefined
            : `0 18px 48px -38px ${accentColor}66, inset 0 -1px 0 ${accentColor}18`,
      }}
    >
      <div className="mx-auto flex h-8 max-w-screen-2xl items-center justify-center overflow-hidden px-3 text-[0.72rem] leading-none md:h-9 md:px-6 md:text-xs">
        <div className="flex min-w-0 items-center justify-center gap-2 text-center">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
            style={{ backgroundColor: iconBackground, borderColor: iconBorder }}
            aria-hidden="true"
          >
            <AlertCircle className="h-3 w-3" style={{ color: accentColor }} />
          </span>
          <div className={cn('min-w-0 truncate', surface.textSecondary)}>
            <span className={cn('font-semibold', surface.textPrimary)}>{title}</span>
            <span className="mx-1.5 opacity-50" aria-hidden="true">
              |
            </span>
            <span>{beforeLink}</span>
            {hasLink && linkMatch ? (
              <>
                {linkHref ? (
                  <>
                    {' '}
                    <a
                      href={linkHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 align-baseline font-semibold underline decoration-current/30 underline-offset-4 transition-opacity hover:opacity-80"
                      style={{ color: accentColor }}
                    >
                      {linkLabel}
                      <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  </>
                ) : (
                  ` ${linkLabel}`
                )}
                {afterLink}
              </>
            ) : null}
            <span className="mx-1.5 opacity-50" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label={dismissLabel}
              className={cn(
                'text-[0.68rem] font-medium opacity-70 transition-opacity hover:opacity-100 md:text-[0.72rem]',
                surface.textSecondary
              )}
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Layout Component
 * Provides consistent layout structure with sidebar and header
 * Memoized to prevent unnecessary re-renders
 */
export const DashboardLayout = memo(function DashboardLayout({
  children,
  mobileEditActions,
  mobileRoomNavigation,
}: DashboardLayoutProps) {
  const { theme, wallpaper, primaryColor } = useTheme();
  const { lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow((state) => ({
      lowPowerMode: state.lowPowerMode,
      effectsQuality: state.effectsQuality,
    }))
  );
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const isBlack = theme === 'black';
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, lowPowerMode);
  const isMediumEffects = resolvedEffectsQuality === 'medium';
  const isLowEffects = resolvedEffectsQuality === 'low';
  const showSharedGlassBlur = isGlass && resolvedEffectsQuality === 'high';
  const headerController = useHeaderController();
  const [customPanelTopbarDismissedAt, setCustomPanelTopbarDismissedAt] = useState(() =>
    storage.get<number | null>(CUSTOM_PANEL_TOPBAR_DISMISSED_AT_KEY, null)
  );
  const isCustomPanelTopbarDismissed =
    typeof customPanelTopbarDismissedAt === 'number' &&
    Date.now() - customPanelTopbarDismissedAt < CUSTOM_PANEL_TOPBAR_DISMISS_MS;
  const showCustomPanelTopbar =
    CUSTOM_PANEL_TOPBAR_ENABLED && isHomeAssistantAddonMode() && !isCustomPanelTopbarDismissed;
  const dismissCustomPanelTopbar = useCallback(() => {
    const dismissedAt = Date.now();
    storage.set(CUSTOM_PANEL_TOPBAR_DISMISSED_AT_KEY, dismissedAt);
    setCustomPanelTopbarDismissedAt(dismissedAt);
  }, []);

  useEffect(() => {
    if (typeof customPanelTopbarDismissedAt !== 'number') {
      return;
    }

    const remainingMs =
      CUSTOM_PANEL_TOPBAR_DISMISS_MS - (Date.now() - customPanelTopbarDismissedAt);

    if (remainingMs <= 0) {
      storage.remove(CUSTOM_PANEL_TOPBAR_DISMISSED_AT_KEY);
      setCustomPanelTopbarDismissedAt(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      storage.remove(CUSTOM_PANEL_TOPBAR_DISMISSED_AT_KEY);
      setCustomPanelTopbarDismissedAt(null);
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [customPanelTopbarDismissedAt]);

  const bgColor =
    theme === 'light'
      ? 'bg-gray-50'
      : isBlack
        ? 'bg-black'
        : isGlass
          ? 'bg-slate-950'
          : 'bg-[#0a0a0a]';
  const textColor = surface.textPrimary;

  return (
    <div className={`relative min-h-screen overflow-x-clip ${bgColor} ${textColor}`}>
      {/* Background Wallpaper with Theme-Specific Overlay */}
      {wallpaper && (
        <div className="fixed inset-0 z-0">
          {/* Wallpaper Image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${wallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Color Blend Overlay — skipped in LOW: no mixBlendMode is applied and
              the readability layer above it is opaque enough to cover it fully,
              so rendering this div in LOW mode is wasted paint work. */}
          {!isLowEffects && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  theme === 'light'
                    ? `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}46, ${getThemeColorValue(primaryColor)}2a, transparent 70%)`
                    : isBlack
                      ? 'linear-gradient(180deg, rgba(0,0,0,0.68), rgba(0,0,0,0.46) 42%, rgba(0,0,0,0.74))'
                      : isGlass
                        ? resolvedEffectsQuality === 'high'
                          ? `radial-gradient(circle at 14% 14%, rgba(255,255,255,0.24) 0%, transparent 18%), radial-gradient(circle at 16% 18%, ${getThemeColorValue(primaryColor)}52 0%, transparent 34%), radial-gradient(circle at 84% 12%, rgba(255,255,255,0.22) 0%, transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 24%, transparent 58%)`
                          : `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}28, rgba(255,255,255,0.08), rgba(15,23,42,0.18) 72%)`
                        : `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}40, ${getThemeColorValue(primaryColor)}20, transparent 60%)`,
                mixBlendMode: theme === 'light' ? 'multiply' : isGlass ? 'screen' : undefined,
              }}
            />
          )}

          {/* Shared readability/glass layer */}
          <div
            className={`absolute inset-0 ${showSharedGlassBlur ? 'backdrop-blur-sm' : ''}`}
            style={{
              backgroundColor:
                theme === 'light'
                  ? isLowEffects
                    ? 'rgba(249, 250, 251, 0.82)'
                    : 'rgba(249, 250, 251, 0.50)'
                  : isBlack
                    ? isLowEffects
                      ? 'rgba(0, 0, 0, 0.74)'
                      : isMediumEffects
                        ? 'rgba(0, 0, 0, 0.62)'
                        : 'rgba(0, 0, 0, 0.52)'
                    : isGlass
                      ? resolvedEffectsQuality === 'high'
                        ? 'rgba(7, 12, 22, 0.40)'
                        : isMediumEffects
                          ? 'rgba(8, 13, 22, 0.66)'
                          : 'rgba(8, 12, 20, 0.82)'
                      : 'rgba(10, 10, 10, 0.55)',
            }}
          />
        </div>
      )}

      {isGlass && !wallpaper && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                resolvedEffectsQuality === 'high'
                  ? 'radial-gradient(circle at 12% 10%, rgba(255,255,255,0.20) 0%, transparent 18%), radial-gradient(circle at 14% 18%, rgba(255,255,255,0.10) 0%, transparent 26%), radial-gradient(circle at 18% 80%, rgba(59,130,246,0.20) 0%, transparent 28%), radial-gradient(circle at 82% 14%, rgba(255,255,255,0.10) 0%, transparent 24%), radial-gradient(circle at 78% 72%, rgba(255,255,255,0.06) 0%, transparent 22%), linear-gradient(180deg, rgba(12,18,32,0.95), rgba(7,10,18,0.98))'
                  : isMediumEffects
                    ? 'linear-gradient(180deg, rgba(18,24,38,0.96), rgba(10,14,24,0.98)), linear-gradient(135deg, rgba(255,255,255,0.05), transparent 42%)'
                    : 'linear-gradient(180deg, rgba(12,18,32,0.98), rgba(7,10,18,0.99))',
            }}
          />
          {showSharedGlassBlur ? (
            <div className="absolute inset-0 transform-[translateZ(0)] backdrop-blur-[28px]" />
          ) : null}
        </div>
      )}

      {/* Content */}
      <div className={cn('relative z-10 overflow-x-clip', showCustomPanelTopbar && 'pt-8 md:pt-9')}>
        {showCustomPanelTopbar ? (
          <CustomPanelTopbar
            dismissLabel="Dismiss"
            title={headerController.t('notifications.navet.addonPhaseOut.title')}
            message={headerController.t('notifications.navet.addonPhaseOut.message')}
            onDismiss={dismissCustomPanelTopbar}
            primaryColor={primaryColor}
            theme={theme}
          />
        ) : null}

        <Sidebar
          activeColorValue={headerController.activeColorValue}
          handleClearSearch={headerController.handleClearSearch}
          handleSearchChange={headerController.handleSearchChange}
          handleToggleMobileSearch={headerController.handleToggleMobileSearch}
          hoverBg={headerController.hoverBg}
          inputBg={headerController.inputBg}
          isMobileSearchOpen={headerController.isMobileSearchOpen}
          isSearchActive={headerController.isSearchActive}
          isSearchFocused={headerController.isSearchFocused}
          mobileRoomNavigation={mobileRoomNavigation}
          mobileSearchInputRef={headerController.mobileSearchInputRef}
          searchQuery={headerController.searchQuery}
          setIsSearchFocused={headerController.setIsSearchFocused}
          textPrimary={headerController.textPrimary}
          textSecondary={headerController.textSecondary}
          topbarVisible={showCustomPanelTopbar}
        />

        <div className="safe-area-pt-5 min-w-0 flex flex-col gap-3.5 overflow-x-clip p-3 pb-20 md:ml-16 md:gap-6 md:p-6 md:pb-6 lg:p-8 lg:pb-8">
          <Header
            controller={headerController}
            mobileEditActions={mobileEditActions}
            mobileRoomNavigation={mobileRoomNavigation}
          />
          {children}
        </div>
      </div>
    </div>
  );
});

export type { DashboardLayoutProps } from './types';
