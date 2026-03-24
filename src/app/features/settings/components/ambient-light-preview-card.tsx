import { Lightbulb } from 'lucide-react';
import { SettingsLivePreviewFrame } from '@/app/components/shared/settings-live-preview-frame';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { getLightCardSurfaceTokens } from '@/app/features/lighting/components/light-card/light-card-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';

interface AmbientLightPreviewCardProps {
  accentColor: string;
  ambientLightBleed: boolean;
  theme: ThemeType;
}

export function AmbientLightPreviewCard({
  accentColor,
  ambientLightBleed,
  theme,
}: AmbientLightPreviewCardProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const isLightTheme = theme === 'light';
  const isContrastTheme = theme === 'contrast';
  const previewTokens = getThemeAppearancePickerTokens(theme, accentColor);

  const previewSurfaceClassName = isLightTheme
    ? 'bg-transparent'
    : isContrastTheme
      ? 'bg-black border-white/16'
      : theme === 'glass'
        ? 'bg-[#111827]/72 border-white/10'
        : 'bg-gray-900/95 border-white/10';
  const primaryBarColor = previewTokens.previewPrimaryBarColor;
  const secondaryBarColor = previewTokens.previewSecondaryBarColor;
  const surfaceTokens = getLightCardSurfaceTokens({
    isOn: true,
    selectedColor: null,
    theme,
    lightColors: colors.switch.on,
    accentColor,
  });
  const glowOpacityClassName = ambientLightBleed
    ? isLightTheme
      ? 'opacity-100'
      : 'opacity-95'
    : 'opacity-0';

  return (
    <SettingsLivePreviewFrame
      accentColor={accentColor}
      className="w-full"
      theme={theme}
      title={t('settings.preview.lightCardTitle')}
      subtitle={
        ambientLightBleed
          ? t('settings.preview.ambientBleedEnabled')
          : t('settings.preview.containedInsideCard')
      }
    >
      <div className={`relative rounded-[18px] ${previewSurfaceClassName}`}>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-[-18%] top-1/2 h-28 -translate-y-1/2 blur-3xl transition-opacity duration-300 ${glowOpacityClassName}`}
          style={{
            background: `radial-gradient(circle, ${surfaceTokens.glowColor}d9 0%, ${surfaceTokens.glowColor}73 24%, ${surfaceTokens.glowColor}26 54%, transparent 78%)`,
          }}
        />

        <div
          className={`relative z-10 rounded-[18px] border p-2.5 ${surfaceTokens.cardClassName}`}
          style={surfaceTokens.cardStyle}
        >
          {surfaceTokens.innerOverlayClassName ? (
            <div
              className={surfaceTokens.innerOverlayClassName}
              style={surfaceTokens.innerOverlayStyle}
            />
          ) : null}

          {surfaceTokens.shineOverlayClassName ? (
            <div className={surfaceTokens.shineOverlayClassName} />
          ) : null}

          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}26` }}
            >
              <Lightbulb className="h-3.5 w-3.5" style={{ color: accentColor }} />
            </div>
            <div className="flex-1">
              <div
                className="h-2.5 rounded-full"
                style={{ width: '54%', backgroundColor: primaryBarColor }}
              />
              <div
                className="mt-1.5 h-2 rounded-full"
                style={{ width: '34%', backgroundColor: secondaryBarColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </SettingsLivePreviewFrame>
  );
}
