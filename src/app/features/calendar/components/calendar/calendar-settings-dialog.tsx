import { Palette, Sliders } from 'lucide-react';
import { useState } from 'react';
import {
  CardDialogChoicePill,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
  SelectableCheckboxRow,
} from '@/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@/app/components/shared/device-editor';
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
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';

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
  const entityType = getEntityTypeLabel(entityId);
  const { primaryColor, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const isOn = theme !== 'light';
  const accentColor = getThemeColorValue(primaryColor);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? accentColor;
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    padding: false,
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
        <div className="p-6">
          <CardDialogHeader title={title} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              {onTintColorChange ? (
                <CardDialogTabTrigger
                  active={activeTab === 'card'}
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  Customize
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-4">
              <CardDialogSection label={t('calendar.settings.view')} className="mb-4">
                <div className="inline-flex items-center gap-1">
                  {(['week', 'month'] as const).map((option) => (
                    <CardDialogChoicePill
                      key={option}
                      active={viewMode === option}
                      onClick={() => onViewModeChange(option)}
                    >
                      {option === 'week'
                        ? t('calendar.settings.thisWeek')
                        : t('calendar.settings.thisMonth')}
                    </CardDialogChoicePill>
                  ))}
                </div>
              </CardDialogSection>

              <CardDialogSection label={t('calendar.settings.calendars')}>
                <div className="space-y-2">
                  {calendars.map((calendar) => {
                    const isSelected = selectedCalendarIds.includes(calendar.id);

                    return (
                      <SelectableCheckboxRow
                        key={calendar.id}
                        checked={isSelected}
                        onCheckedChange={() => {
                          onSelectedCalendarIdsChange(
                            isSelected
                              ? selectedCalendarIds.filter((id) => id !== calendar.id)
                              : [...selectedCalendarIds, calendar.id]
                          );
                        }}
                        label={calendar.name}
                        leading={<div className={`h-5 w-1 rounded-full ${calendar.color}`} />}
                        rowClassName={`items-center ${surface.hoverBg}`}
                        labelClassName={`truncate ${surface.textPrimary}`}
                        checkboxPaletteColor={activeAccentColor}
                        style={sectionStyle}
                        selectedStyle={{
                          backgroundColor:
                            theme === 'light' ? `${activeAccentColor}0d` : `${activeAccentColor}16`,
                          borderColor: `${activeAccentColor}4d`,
                        }}
                        unselectedStyle={sectionStyle}
                      />
                    );
                  })}
                </div>
              </CardDialogSection>
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
