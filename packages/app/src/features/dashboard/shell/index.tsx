import { Header } from '@navet/app/components/layout/header';
import { Sidebar } from '@navet/app/components/layout/sidebar';
import { useHeaderController } from '@navet/app/components/layout/use-header-controller';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { resolveWallpaperBackgroundImage } from '@navet/app/constants/built-in-wallpapers';
import { usePrimaryColor, useThemeMode, useWallpaper } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { resolveEffectsQuality } from '@navet/app/utils/effects-quality';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { KioskOrbitMenu } from './kiosk-orbit-menu';
import type { DashboardLayoutProps } from './types';

/**
 * Dashboard Layout Component
 * Provides consistent layout structure with sidebar and header
 * Memoized to prevent unnecessary re-renders
 */
export const DashboardLayout = memo(function DashboardLayout({
  children,
  densePerformanceMode = false,
  mobileEditActions,
  mobileRoomNavigation,
}: DashboardLayoutProps) {
  const theme = useThemeMode();
  const wallpaper = useWallpaper();
  const primaryColor = usePrimaryColor();
  const { lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow((state) => ({
      lowPowerMode: state.lowPowerMode,
      effectsQuality: state.effectsQuality,
    }))
  );
  const kioskMode = useSettingsStore(settingsSelectors.kioskMode);
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const isBlack = theme === 'black';
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, lowPowerMode);
  const isMediumEffects = resolvedEffectsQuality === 'medium';
  const isLowEffects = resolvedEffectsQuality === 'low';
  const showSharedGlassBlur = isGlass && resolvedEffectsQuality === 'high' && !densePerformanceMode;
  const headerController = useHeaderController();
  const wallpaperBackgroundImage = resolveWallpaperBackgroundImage(wallpaper);
  const accentColorValue = getThemeColorValue(primaryColor);

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
      {wallpaperBackgroundImage && (
        <div className="fixed inset-0 z-0">
          {/* Wallpaper Image */}
          <div
            data-testid="dashboard-wallpaper-image"
            className="absolute inset-0"
            style={{
              backgroundImage: wallpaperBackgroundImage,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Color Blend Overlay — skipped in LOW: no mixBlendMode is applied and
              the readability layer above it is opaque enough to cover it fully,
              so rendering this div in LOW mode is wasted paint work. */}
          {!isLowEffects && !densePerformanceMode && (
            <div
              data-testid="dashboard-wallpaper-accent-overlay"
              className="absolute inset-0"
              style={{
                background:
                  theme === 'light'
                    ? `radial-gradient(circle at 14% 14%, rgba(255,255,255,0.34) 0%, transparent 24%), linear-gradient(135deg, ${accentColorValue}2e 0%, ${accentColorValue}16 40%, rgba(255,255,255,0.10) 76%, transparent 100%)`
                    : isBlack
                      ? 'linear-gradient(180deg, rgba(0,0,0,0.68), rgba(0,0,0,0.46) 42%, rgba(0,0,0,0.74))'
                      : isGlass
                        ? resolvedEffectsQuality === 'high'
                          ? `radial-gradient(circle at 14% 14%, rgba(255,255,255,0.24) 0%, transparent 18%), radial-gradient(circle at 16% 18%, ${accentColorValue}52 0%, transparent 34%), radial-gradient(circle at 84% 12%, rgba(255,255,255,0.22) 0%, transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 24%, transparent 58%)`
                          : `linear-gradient(135deg, ${accentColorValue}28, rgba(255,255,255,0.08), rgba(15,23,42,0.18) 72%)`
                        : `linear-gradient(135deg, ${accentColorValue}40, ${accentColorValue}20, transparent 60%)`,
                mixBlendMode: isGlass ? 'screen' : undefined,
              }}
            />
          )}

          {/* Shared readability/glass layer */}
          <div
            data-testid="dashboard-wallpaper-readability-layer"
            className={`absolute inset-0 ${showSharedGlassBlur ? 'backdrop-blur-sm' : ''}`}
            style={{
              backgroundColor:
                theme === 'light'
                  ? isLowEffects
                    ? 'rgba(249, 250, 251, 0.86)'
                    : 'rgba(249, 250, 251, 0.68)'
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

      {isGlass && !wallpaperBackgroundImage && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                resolvedEffectsQuality === 'high' && !densePerformanceMode
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
      <div className="relative z-10 overflow-x-clip">
        {kioskMode ? null : (
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
          />
        )}

        <div
          data-testid="dashboard-layout-content"
          className={`safe-area-pt-5 min-w-0 flex flex-col overflow-x-clip ${
            kioskMode
              ? dashboardSpaceMode === 'more_space'
                ? 'gap-3 px-1.5 py-2 pb-24 md:gap-4 md:px-3 md:py-4 md:pb-24 lg:px-4 lg:py-5 lg:pb-24'
                : 'gap-3 p-2 pb-24 md:gap-4 md:p-4 md:pb-24 lg:p-5 lg:pb-24'
              : dashboardSpaceMode === 'more_space'
                ? 'gap-3.5 px-2.5 py-3 pb-20 md:ml-16 md:gap-6 md:px-4 md:py-6 md:pb-6 lg:px-5 lg:py-8 lg:pb-8'
                : 'gap-3.5 p-3 pb-20 md:ml-16 md:gap-6 md:p-6 md:pb-6 lg:p-8 lg:pb-8'
          }`}
        >
          {kioskMode ? null : (
            <Header
              controller={headerController}
              mobileEditActions={mobileEditActions}
              mobileRoomNavigation={mobileRoomNavigation}
            />
          )}
          {children}
        </div>
        {kioskMode ? (
          <KioskOrbitMenu editActions={mobileEditActions} roomNavigation={mobileRoomNavigation} />
        ) : null}
      </div>
    </div>
  );
});

export type { DashboardLayoutProps } from './types';
