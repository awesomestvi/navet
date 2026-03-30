import { useI18n } from '@/app/hooks';
import { CalendarEventItem } from './calendar-event-item';
import { getCalendarDateParts } from './calendar-formatters';
import type { CalendarEvent, CalendarEventGroup } from './types';

interface CalendarDateRailProps {
  date: Date | null;
  textPrimary: string;
  textSecondary: string;
  density?: 'default' | 'compact';
}

interface CalendarAgendaListProps {
  dayGroups: CalendarEventGroup[];
  textPrimary: string;
  textSecondary: string;
  hoverText: string;
  hoverBg: string;
  dividerColor?: string;
  onEventClick?: (event: CalendarEvent) => void;
  density?: 'default' | 'compact';
}

export function CalendarDateRail({
  date,
  textPrimary,
  textSecondary,
  density = 'default',
}: CalendarDateRailProps) {
  const { locale } = useI18n();
  const { weekdayShort, dayNumber, monthShort } = getCalendarDateParts(date, locale);
  const isCompact = density === 'compact';

  return (
    <div
      className={`flex flex-shrink-0 flex-col items-center text-center ${
        isCompact ? 'w-[36px] pt-0.5' : 'w-[42px] pt-1'
      }`}
    >
      <div
        className={`${isCompact ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-[0.14em]`}
        style={{ color: textPrimary }}
      >
        {weekdayShort}
      </div>
      <div
        className={`${isCompact ? 'text-[13px]' : 'text-[15px]'} font-semibold leading-none`}
        style={{ color: textPrimary }}
      >
        {dayNumber}
      </div>
      <div
        className={`${isCompact ? 'mt-0 text-[9px]' : 'mt-0.5 text-[10px]'} uppercase tracking-[0.14em]`}
        style={{ color: textSecondary }}
      >
        {monthShort.toUpperCase()}
      </div>
    </div>
  );
}

export function CalendarAgendaList({
  dayGroups,
  textPrimary,
  textSecondary,
  hoverText,
  hoverBg,
  dividerColor,
  onEventClick,
  density = 'default',
}: CalendarAgendaListProps) {
  const isCompact = density === 'compact';

  return (
    <div className={`${isCompact ? 'space-y-2 pb-0.5' : 'space-y-3 pb-1'}`}>
      {dayGroups.map((group, groupIndex) => (
        <div key={group.key}>
          <div className={`flex items-start ${isCompact ? 'gap-2' : 'gap-3'}`}>
            <CalendarDateRail
              date={group.date}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              density={density}
            />

            <div className="min-w-0 flex-1">
              <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
                {group.events.map((event, eventIndex) => (
                  <div key={event.id}>
                    <CalendarEventItem
                      event={event}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      hoverText={hoverText}
                      hoverBg={hoverBg}
                      variant={isCompact ? 'compact' : 'default'}
                      onItemClick={onEventClick ? () => onEventClick(event) : undefined}
                    />
                    {dividerColor && eventIndex < group.events.length - 1 ? (
                      <div
                        className={`${isCompact ? 'ml-2.5 mt-0.5' : 'ml-3 mt-1'} h-px ${dividerColor}`}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {dividerColor && groupIndex < dayGroups.length - 1 ? (
            <div className={`${isCompact ? 'mt-2' : 'mt-3'} h-px ${dividerColor}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
