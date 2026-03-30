import { Check } from 'lucide-react';
import { CustomCardTintPicker, DialogHeader } from '@/app/components/shared/device-editor';
import {
  CustomDialogDoneButton,
  customCardDialogShellProps,
  DialogFooter,
  DialogShell,
} from '@/app/components/shared/dialog-shell';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import { type ThemeType, useTheme } from '@/app/hooks/use-theme';

interface CalendarSourceOption {
  id: string;
  name: string;
  room: string;
  color: string;
}

interface CalendarSettingsDialogProps {
  entityId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
  title: string;
  calendars: CalendarSourceOption[];
  selectedCalendarIds: string[];
  onSelectedCalendarIdsChange: (ids: string[]) => void;
  viewMode: 'week' | 'month';
  onViewModeChange: (viewMode: 'week' | 'month') => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function CalendarSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  theme,
  title,
  calendars,
  selectedCalendarIds,
  onSelectedCalendarIdsChange,
  viewMode,
  onViewModeChange,
  tintColor,
  onTintColorChange,
}: CalendarSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const { primaryColor, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const isOn = theme !== 'light';
  const accentColor = getThemeColorValue(primaryColor);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? accentColor;
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    fallbackDecoration: {
      glowClassName: `bg-linear-to-br ${colors.calendar.glow} to-transparent`,
      overlayClassName:
        theme === 'light' ? 'bg-white/60 backdrop-blur-sm' : 'bg-black/20 backdrop-blur-sm',
    },
    fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border p-6 shadow-2xl ${cardShell.backdropClassName} bg-linear-to-br ${colors.calendar.gradient} ${colors.calendar.border}`,
  });
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, '#6366f1');

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
        title={t('calendar.settings.title')}
        description={t('calendar.settings.description', { title })}
        isOn={isOn}
        supportingContent={
          entityId ? (
            <EntityRoomSelector entityId={entityId} label={t('calendar.settings.room')} compact />
          ) : null
        }
      />

      {onTintColorChange ? (
        <CustomCardTintPicker
          value={tintColor}
          onChange={onTintColorChange}
          defaultColor="#6366f1"
          className={surface.textMuted}
        />
      ) : null}

      <div className="mb-4">
        <div className={`mb-2 text-xs font-medium ${surface.textSecondary}`}>
          {t('calendar.settings.view')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['week', 'month'] as const).map((option) => {
            const isSelected = viewMode === option;

            return (
              <button
                type="button"
                key={option}
                onClick={() => onViewModeChange(option)}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                  isSelected
                    ? `${surface.textPrimary}`
                    : `${surface.border} ${surface.textPrimary} ${surface.hoverBg}`
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor:
                          theme === 'light' ? `${activeAccentColor}12` : `${activeAccentColor}1c`,
                        borderColor: `${activeAccentColor}66`,
                      }
                    : sectionStyle
                }
              >
                {option === 'week'
                  ? t('calendar.settings.thisWeek')
                  : t('calendar.settings.thisMonth')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {calendars.map((calendar) => {
          const isSelected = selectedCalendarIds.includes(calendar.id);

          return (
            <button
              type="button"
              key={calendar.id}
              onClick={() => {
                onSelectedCalendarIdsChange(
                  isSelected
                    ? selectedCalendarIds.filter((id) => id !== calendar.id)
                    : [...selectedCalendarIds, calendar.id]
                );
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${surface.border} ${surface.hoverBg}`}
              style={
                isSelected
                  ? {
                      backgroundColor:
                        theme === 'light' ? `${activeAccentColor}0d` : `${activeAccentColor}16`,
                      borderColor: `${activeAccentColor}4d`,
                    }
                  : sectionStyle
              }
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`h-10 w-1.5 flex-shrink-0 rounded-full ${calendar.color}`} />
                <div className="min-w-0">
                  <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                    {calendar.name}
                  </div>
                  <div className={`mt-0.5 truncate text-xs ${surface.textSecondary}`}>
                    {calendar.room}
                  </div>
                </div>
              </div>

              <div
                className={`ml-4 flex h-5 w-5 items-center justify-center rounded border transition-colors ${surface.textPrimary}`}
                style={
                  isSelected
                    ? {
                        backgroundColor: activeAccentColor,
                        borderColor: activeAccentColor,
                      }
                    : {
                        borderColor:
                          theme === 'light'
                            ? 'rgba(15, 23, 42, 0.16)'
                            : 'rgba(255, 255, 255, 0.18)',
                        backgroundColor: 'transparent',
                      }
                }
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </div>
            </button>
          );
        })}
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
