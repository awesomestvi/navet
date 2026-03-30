import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Header } from '@/app/components/layout/header';
import { Sidebar } from '@/app/components/layout/sidebar';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { useSettingsStore } from '@/app/stores';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import type { DashboardLayoutProps } from './types';

/**
 * Dashboard Layout Component
 * Provides consistent layout structure with sidebar and header
 * Memoized to prevent unnecessary re-renders
 */
export const DashboardLayout = memo(function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme, wallpaper, primaryColor } = useTheme();
  const { lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow((state) => ({
      lowPowerMode: state.lowPowerMode,
      effectsQuality: state.effectsQuality,
    }))
  );
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const isContrast = theme === 'contrast';
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, lowPowerMode);
  const isMediumEffects = resolvedEffectsQuality === 'medium';
  const isLowEffects = resolvedEffectsQuality === 'low';
  const showSharedGlassBlur = isGlass && resolvedEffectsQuality === 'high';

  const bgColor =
    theme === 'light'
      ? 'bg-gray-50'
      : isContrast
        ? 'bg-black'
        : isGlass
          ? 'bg-slate-950'
          : 'bg-[#0a0a0a]';
  const textColor = surface.textPrimary;

  return (
    <div className={`relative min-h-screen overflow-x-clip ${bgColor} ${textColor}`}>
      {/* Background Wallpaper with Color Blend */}
      {wallpaper && !isContrast && (
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

          {/* Color Blend Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                theme === 'light'
                  ? `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}${isLowEffects ? '38' : '46'}, ${getThemeColorValue(primaryColor)}${isLowEffects ? '22' : '2a'}, transparent 70%)`
                  : isGlass
                    ? resolvedEffectsQuality === 'high'
                      ? `radial-gradient(circle at 14% 14%, rgba(255,255,255,0.24) 0%, transparent 18%), radial-gradient(circle at 16% 18%, ${getThemeColorValue(primaryColor)}52 0%, transparent 34%), radial-gradient(circle at 84% 12%, rgba(255,255,255,0.22) 0%, transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 24%, transparent 58%)`
                      : isMediumEffects
                        ? `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}28, rgba(255,255,255,0.08), rgba(15,23,42,0.18) 72%)`
                        : `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}18, rgba(15,23,42,0.12), transparent 72%)`
                    : `linear-gradient(135deg, ${getThemeColorValue(primaryColor)}40, ${getThemeColorValue(primaryColor)}20, transparent 60%)`,
              mixBlendMode: isLowEffects
                ? undefined
                : theme === 'light'
                  ? 'multiply'
                  : isGlass
                    ? 'screen'
                    : undefined,
            }}
          />

          {/* Shared readability/glass layer */}
          <div
            className={`absolute inset-0 ${showSharedGlassBlur ? 'backdrop-blur-sm' : ''}`}
            style={{
              backgroundColor:
                theme === 'light'
                  ? isLowEffects
                    ? 'rgba(249, 250, 251, 0.82)'
                    : 'rgba(249, 250, 251, 0.50)'
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
      <div className="relative z-10 overflow-x-clip">
        <Sidebar />

        <div className="safe-area-pt-5 min-w-0 flex flex-col gap-4 overflow-x-clip p-3 pb-20 md:ml-16 md:gap-8 md:p-6 md:pb-6 lg:p-8 lg:pb-8">
          <Header />
          {children}
        </div>
      </div>
    </div>
  );
});

export type { DashboardLayoutProps } from './types';
