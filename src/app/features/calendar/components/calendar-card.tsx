import { Settings2 } from 'lucide-react';
import { memo, useState } from 'react';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import {
  type CardSize,
  getCompactCardSize,
  isCompactCardSize,
} from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
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
    selectedEvents,
    setSelectedCalendarIds,
    setTintColor,
    setViewMode,
    tintColor,
    viewMode,
  } = useCalendarCardSources(id, events ?? []);
  const { nextEvent, smallGroups, mediumGroups, largeGroups } = useCalendarData(selectedEvents);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const hasCustomTint = Boolean(tintSurface.panelStyle);

  const { textPrimary, textSecondary, overlayBg, dividerColor, hoverBg, hoverText } =
    useCalendarTheme(theme, tintColor);

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
          ${hasCustomTint ? '' : `bg-linear-to-br ${colors.calendar.gradient}`}
          ${cardShell.backdropClassName} border ${hasCustomTint ? '' : colors.calendar.border}
          ${theme === 'light' ? 'shadow-lg' : 'shadow-lg hover:shadow-xl'}
          transition-all duration-300
          ${!inEditMode ? 'cursor-pointer' : ''}
        `}
        style={tintSurface.panelStyle}
      >
        <div className={`absolute inset-0 ${overlayBg}`} />
        {tintSurface.glowStyle ? (
          <div className="absolute inset-0" style={tintSurface.glowStyle} />
        ) : null}
        {tintSurface.overlayClassName ? (
          <div className={`pointer-events-none absolute inset-0 ${tintSurface.overlayClassName}`} />
        ) : null}
        {!hasCustomTint ? (
          <div
            className={`absolute inset-0 bg-linear-to-br ${colors.calendar.glow} to-transparent`}
          />
        ) : null}

        <div className={`relative flex h-full flex-col ${isSmall ? 'p-3' : 'p-4'}`}>
          {canOpenSettings ? (
            <div className="absolute bottom-3 right-3 z-10">
              <EntityCardHeaderIcon
                IconComponent={Settings2}
                isActive={true}
                size={effectiveSize}
                tone="indigo"
                baseColor={tintColor}
                ariaLabel={t('calendar.settings.title')}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsSettingsOpen(true);
                }}
              />
            </div>
          ) : null}

          {!nextEvent ? (
            <div
              className="flex flex-1 items-center justify-center text-sm"
              style={{ color: textSecondary }}
            >
              {t('calendar.noUpcomingEvents')}
            </div>
          ) : isSmall ? (
            <CalendarSmallView
              dayGroups={smallGroups}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverText={hoverText}
              hoverBg={hoverBg}
              onEventClick={inEditMode ? undefined : setSelectedEvent}
            />
          ) : isMedium ? (
            <CalendarMediumView
              dayGroups={mediumGroups}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverText={hoverText}
              hoverBg={hoverBg}
              dividerColor={dividerColor}
              onEventClick={inEditMode ? undefined : setSelectedEvent}
            />
          ) : (
            <CalendarLargeView
              dayGroups={largeGroups}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              hoverText={hoverText}
              hoverBg={hoverBg}
              dividerColor={dividerColor}
              onEventClick={inEditMode ? undefined : setSelectedEvent}
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
          tintColor={tintColor}
          onTintColorChange={setTintColor}
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
