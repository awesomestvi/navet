import * as Dialog from '@radix-ui/react-dialog';
import { Check } from 'lucide-react';
import { DialogHeader, DialogSectionRow } from '@/app/components/shared/device-editor';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
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
}: CalendarSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const { primaryColor } = useTheme();
  const isOn = theme !== 'light';
  const accentColor = getThemeColorValue(primaryColor);

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={`fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
    >
      <DialogHeader
        title={t('calendar.settings.title')}
        description={t('calendar.settings.description', { title })}
        isOn={isOn}
      />
      {entityId ? (
        <DialogSectionRow label={t('calendar.settings.room')}>
          <EntityRoomSelector entityId={entityId} label={t('calendar.settings.room')} compact />
        </DialogSectionRow>
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
                    : `${surface.border} ${surface.subtleBg} ${surface.textPrimary} ${surface.hoverBg}`
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor:
                          theme === 'light' ? `${accentColor}12` : `${accentColor}1c`,
                        borderColor: `${accentColor}66`,
                      }
                    : undefined
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
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${surface.border} ${surface.subtleBg} ${surface.hoverBg}`}
              style={
                isSelected
                  ? {
                      backgroundColor: theme === 'light' ? `${accentColor}0d` : `${accentColor}16`,
                      borderColor: `${accentColor}4d`,
                    }
                  : undefined
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
                        backgroundColor: accentColor,
                        borderColor: accentColor,
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

      <div className="mt-6 flex justify-end">
        <Dialog.Close asChild>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${surface.textPrimary} ${surface.subtleBg} ${surface.hoverBg}`}
          >
            {t('common.done')}
          </button>
        </Dialog.Close>
      </div>
    </DialogShell>
  );
}
