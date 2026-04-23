import { useI18n } from '@/app/hooks';
import { CalendarEventItem } from './calendar-event-item';
import { formatCalendarGroupLabel } from './calendar-formatters';
import type { CalendarEvent, CalendarEventGroup } from './types';

interface CalendarSmallViewProps {
  dayGroups: CalendarEventGroup[];
  textPrimary: string;
  textSecondary: string;
  hoverText: string;
  hoverBg: string;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarSmallView({
  dayGroups,
  textPrimary,
  textSecondary,
  hoverText,
  hoverBg,
  onEventClick,
}: CalendarSmallViewProps) {
  const { locale } = useI18n();
  if (dayGroups.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-hide pr-1">
        {dayGroups.map((group) => (
          <div key={group.key}>
            <div className="mb-1 px-1 text-xs font-medium" style={{ color: textSecondary }}>
              {formatCalendarGroupLabel(group.date, locale)}
            </div>
            <div className="space-y-1">
              {group.events.map((event) => (
                <CalendarEventItem
                  key={event.id}
                  event={event}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  hoverText={hoverText}
                  hoverBg={hoverBg}
                  onItemClick={onEventClick ? () => onEventClick(event) : undefined}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
