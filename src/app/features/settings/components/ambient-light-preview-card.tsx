import { Lightbulb } from 'lucide-react';
import { SettingsLivePreviewFrame } from '@/app/components/patterns/settings-live-preview-frame';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { getLightCardSurfaceTokens } from '@/app/features/lighting';
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
  const isBlackTheme = theme === 'black';
  const previewTokens = getThemeAppearancePickerTokens(theme, accentColor);

  const previewSurfaceClassName = isLightTheme
    ? 'bg-transparent'
    : isBlackTheme
      ? 'bg-black border-white/16'
      : theme === 'glass'
        ? 'bg-[#111827]/72 border-white/10'
        : 'bg-gray-900/95 border-white/10';
  const primaryBarColor = previewTokens.previewPrimaryBarColor;
  const secondaryBarColor = previewTokens.previewSecondaryBarColor;
  const stateSurface = getCardStateSurfaceTokens(theme, true);
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

          <div className="relative">
            <EntityCardHeader
              title={t('settings.preview.lightCardTitle')}
              subtitle={t('lighting.type.light')}
              layout="eyebrow-first"
              size="small"
              tone="primary"
              titleClassName={stateSurface.primaryTextClassName}
              subtitleClassName={stateSurface.mutedTextClassName}
              marginBottomClassName="mb-2.5"
              leading={
                <EntityCardHeaderIcon
                  IconComponent={Lightbulb}
                  isActive
                  size="small"
                  tone="primary"
                />
              }
            />
            <div className="ml-11">
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
