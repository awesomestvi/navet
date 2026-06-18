import {
  CardDialogChoicePill,
  CardDialogSection,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import { BaseCardDialogWithState } from '@navet/app/components/primitives';
import {
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import { type ThemeType, useTheme } from '@navet/app/hooks/use-theme';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';

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
  const isRealCalendarEntity =
    entityId !== undefined && calendars.some((calendar) => calendar.id === entityId);
  const roomSelectorEntityId = isRealCalendarEntity
    ? entityId
    : (selectedCalendarIds.find((id) => calendars.some((calendar) => calendar.id === id)) ??
      calendars[0]?.id);
  const { accentColor } = useTheme();
  const activeAccentColor = normalizeCustomCardTint(tintColor) ?? accentColor;
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, '#6366f1');

  const controlsTabContent = (
    <div className="space-y-4">
      <CardDialogSection label={t('calendar.settings.view')} className="mb-4">
        <div className="inline-flex items-center gap-1">
          {(['week', 'month'] as const).map((option) => (
            <CardDialogChoicePill
              key={option}
              active={viewMode === option}
              size="compact"
              className="min-w-0"
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
    </div>
  );

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      entityId={roomSelectorEntityId}
      description={entityType}
      editableTitle={isRealCalendarEntity}
      roomSelectorFallbackRoomName={calendars[0]?.room}
      controlsTabContent={controlsTabContent}
      tintColor={tintColor}
      onTintColorChange={onTintColorChange}
      defaultTintAccent="#6366f1"
      theme={theme}
    />
  );
}
