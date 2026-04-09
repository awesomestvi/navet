import * as Dialog from '@radix-ui/react-dialog';
import { Check, Palette, Sliders, X } from 'lucide-react';
import { useState } from 'react';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@/app/components/primitives/dialog-shell';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import {
  CustomCardTintPicker,
  CustomScrollbar,
  DialogSectionRow,
} from '@/app/components/shared/device-editor';
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
    fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl ${cardShell.backdropClassName} bg-linear-to-br ${colors.calendar.gradient} ${colors.calendar.border}`,
  });
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, '#6366f1');
  const [activeTab, setActiveTab] = useState('controls');

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <CustomScrollbar isOn={isOn}>
        <div className="p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {entityId ? <EntityRoomSelector entityId={entityId} compact forceDark /> : null}
              <h2 className={`text-xl font-semibold text-white ${entityId ? 'mt-2' : ''}`}>
                {title}
              </h2>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-white/10 bg-white/6 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <div className="mt-1 inline-flex items-center gap-1">
              <InteractivePill
                active={activeTab === 'controls'}
                size="compact"
                className="min-h-8 px-3 text-[11px]"
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </InteractivePill>
              {onTintColorChange ? (
                <InteractivePill
                  active={activeTab === 'card'}
                  size="compact"
                  className="min-h-8 px-3 text-[11px]"
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  Card
                </InteractivePill>
              ) : null}
            </div>

            <TabPanel value="controls" className="mt-5 space-y-4">
              <DialogSectionRow label={t('calendar.settings.view')} className="mb-4">
                <div className="inline-flex items-center gap-1">
                  {(['week', 'month'] as const).map((option) => (
                    <InteractivePill
                      key={option}
                      active={viewMode === option}
                      size="compact"
                      className="min-h-8 px-3 text-[11px]"
                      onClick={() => onViewModeChange(option)}
                    >
                      {option === 'week'
                        ? t('calendar.settings.thisWeek')
                        : t('calendar.settings.thisMonth')}
                    </InteractivePill>
                  ))}
                </div>
              </DialogSectionRow>

              <DialogSectionRow label={t('calendar.settings.calendars')}>
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
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${surface.border} ${surface.hoverBg}`}
                        style={
                          isSelected
                            ? {
                                backgroundColor:
                                  theme === 'light'
                                    ? `${activeAccentColor}0d`
                                    : `${activeAccentColor}16`,
                                borderColor: `${activeAccentColor}4d`,
                              }
                            : sectionStyle
                        }
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className={`h-5 w-1 shrink-0 rounded-full ${calendar.color}`} />
                          <span className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                            {calendar.name}
                          </span>
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
              </DialogSectionRow>
            </TabPanel>

            {onTintColorChange ? (
              <TabPanel value="card" className="mt-5">
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  isOn={isOn}
                  defaultColor="#6366f1"
                  pickerRingColor={activeAccentColor}
                  resetButtonStyle={sectionStyle}
                />
              </TabPanel>
            ) : null}
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
}
