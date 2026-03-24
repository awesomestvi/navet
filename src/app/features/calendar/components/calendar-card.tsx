import { CalendarDays } from 'lucide-react';
import { memo, useState } from 'react';
import {
  type CardSize,
  getCompactCardSize,
  isCompactCardSize,
} from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { CalendarEventDialog } from './calendar/calendar-event-dialog';
import { CalendarLargeView } from './calendar/calendar-large-view';
import { CalendarMediumView } from './calendar/calendar-medium-view';
import { CalendarSettingsDialog } from './calendar/calendar-settings-dialog';
import { CalendarSmallView } from './calendar/calendar-small-view';
import type { CalendarEvent } from './calendar/types';
import { useCalendarCardSources } from './calendar/use-calendar-card-sources';
import { useCalendarData } from './calendar/use-calendar-data';
import { useCalendarTheme } from './calendar/use-calendar-theme';

interface CalendarCardProps {
  id?: string;
  name?: string;
  room?: string;
  events?: CalendarEvent[];
  inEditMode?: boolean;
  size?: CardSize;
  onSizeChange?: (size: CardSize) => void;
}

export const CalendarCard = memo(function CalendarCard({
  id,
  name,
  events,
  inEditMode = false,
  size = 'medium',
  onSizeChange: _onSizeChange,
}: CalendarCardProps) {
  const { t } = useI18n();
  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const effectiveSize = getCompactCardSize(size);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const {
    availableCalendars,
    selectedCalendarIds,
    selectedCalendarLabel,
    selectedEvents,
    setSelectedCalendarIds,
    setViewMode,
    viewMode,
  } = useCalendarCardSources(id, events ?? []);
  const { nextEvent, smallGroups, mediumGroups, largeGroups } = useCalendarData(selectedEvents);

  const { textPrimary, textSecondary, overlayBg, dividerColor, hoverBg, hoverText } =
    useCalendarTheme(theme);

  const isSmall = isCompactCardSize(effectiveSize);
  const isMedium = effectiveSize === 'medium';
  const canOpenSettings = !inEditMode;
  const displayName = name ?? t('calendar.defaultTitle');

  return (
    <>
      <div
        className={`
          relative group overflow-hidden
          h-full w-full rounded-3xl
          bg-gradient-to-br ${colors.calendar.gradient}
          ${cardShell.backdropClassName} border ${colors.calendar.border}
          ${theme === 'light' ? 'shadow-lg' : 'shadow-lg hover:shadow-xl'}
          transition-all duration-300
          ${inEditMode ? 'cursor-move' : 'cursor-pointer'}
        `}
      >
        <div className={`absolute inset-0 ${overlayBg}`} />
        <div
          className={`absolute inset-0 bg-gradient-to-br ${colors.calendar.glow} to-transparent`}
        />

        <div className={`relative flex h-full flex-col ${isSmall ? 'p-3' : 'p-4'}`}>
          {canOpenSettings ? (
            <button
              type="button"
              className={`${isSmall ? 'mb-2' : 'mb-3'} block w-full text-left`}
              onClick={(event) => {
                event.stopPropagation();
                setIsSettingsOpen(true);
              }}
            >
              <EntityCardHeader
                title={selectedCalendarLabel || displayName}
                subtitle={t('calendar.upcomingAgenda')}
                size={effectiveSize}
                tone="indigo"
                titleClassName={isSmall ? 'text-[11px]' : ''}
                subtitleClassName={isSmall ? 'text-[9px]' : ''}
                leading={
                  <EntityCardHeaderIcon
                    IconComponent={CalendarDays}
                    isActive={true}
                    size={effectiveSize}
                    tone="indigo"
                  />
                }
              />
            </button>
          ) : (
            <EntityCardHeader
              title={selectedCalendarLabel || displayName}
              subtitle={t('calendar.upcomingAgenda')}
              size={effectiveSize}
              tone="indigo"
              titleClassName={isSmall ? 'text-[11px]' : ''}
              subtitleClassName={isSmall ? 'text-[9px]' : ''}
              leading={
                <EntityCardHeaderIcon
                  IconComponent={CalendarDays}
                  isActive={true}
                  size={effectiveSize}
                  tone="indigo"
                />
              }
            />
          )}

          {!nextEvent ? (
            <div className={`flex flex-1 items-center justify-center text-sm ${textSecondary}`}>
              {t('calendar.noUpcomingEvents')}
            </div>
          ) : isSmall ? (
            <CalendarSmallView
              dayGroups={smallGroups}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverText={hoverText}
              hoverBg={hoverBg}
              onEventClick={setSelectedEvent}
            />
          ) : isMedium ? (
            <CalendarMediumView
              dayGroups={mediumGroups}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverText={hoverText}
              hoverBg={hoverBg}
              dividerColor={dividerColor}
              onEventClick={setSelectedEvent}
            />
          ) : (
            <CalendarLargeView
              dayGroups={largeGroups}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverText={hoverText}
              hoverBg={hoverBg}
              dividerColor={dividerColor}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>
      </div>

      {isSettingsOpen ? (
        <CalendarSettingsDialog
          entityId={id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          theme={theme}
          title={displayName}
          calendars={availableCalendars.map((calendar) => ({
            id: calendar.id,
            name: calendar.name,
            room: calendar.room,
            color: calendar.color,
          }))}
          selectedCalendarIds={selectedCalendarIds}
          onSelectedCalendarIdsChange={setSelectedCalendarIds}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      ) : null}

      {selectedEvent ? (
        <CalendarEventDialog
          event={selectedEvent}
          isOpen={selectedEvent !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedEvent(null);
            }
          }}
          theme={theme}
        />
      ) : null}
    </>
  );
});
