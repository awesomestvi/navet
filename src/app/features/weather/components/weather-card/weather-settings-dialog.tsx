import { CustomCardTintPicker, DialogHeader } from '@/app/components/shared/device-editor';
import {
  CustomDialogDoneButton,
  customCardDialogShellProps,
  DialogFooter,
  DialogShell,
} from '@/app/components/shared/dialog-shell';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { WeatherForecastMode } from '@/app/stores/settings-store';

interface WeatherSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
  title: string;
  location: string;
  forecastMode: WeatherForecastMode;
  onForecastModeChange: (mode: WeatherForecastMode) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function WeatherSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  theme,
  title,
  location,
  forecastMode,
  onForecastModeChange,
  tintColor,
  onTintColorChange,
}: WeatherSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const shell = getAccentCardShellTokens(theme, 'blue');
  const isOn = theme !== 'light';
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? '#3b82f6';
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    fallbackDecoration: {
      glowClassName: shell.glowClassName,
      overlayClassName: shell.overlayClassName,
    },
    fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${shell.containerClassName}`,
  });
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, '#3b82f6');

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <DialogHeader
        title={t('weather.settings.title', { name: title })}
        description={location}
        isOn={isOn}
        supportingContent={
          <EntityRoomSelector entityId={entityId} label={t('common.room')} compact />
        }
      />

      {onTintColorChange ? (
        <CustomCardTintPicker
          value={tintColor}
          onChange={onTintColorChange}
          defaultColor="#3b82f6"
          className={surface.textMuted}
        />
      ) : null}

      <div className="mb-4">
        <div className={`mb-2 text-xs font-medium ${surface.textSecondary}`}>
          {t('weather.settings.forecast')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['hourly', 'weekly'] as const).map((option) => {
            const isSelected = forecastMode === option;

            return (
              <button
                type="button"
                key={option}
                onClick={() => onForecastModeChange(option)}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'text-white'
                    : `${surface.border} ${surface.textPrimary} ${surface.hoverBg}`
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: activeAccentColor,
                        borderColor: activeAccentColor,
                      }
                    : sectionStyle
                }
              >
                {option === 'hourly' ? t('weather.settings.hourly') : t('weather.settings.weekly')}
              </button>
            );
          })}
        </div>
      </div>

      <DialogFooter>
        <CustomDialogDoneButton
          label={t('common.done')}
          style={{ backgroundColor: activeAccentColor }}
        />
      </DialogFooter>
    </DialogShell>
  );
}
