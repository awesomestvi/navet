import { CalendarAgendaList } from './calendar-primitives';
import type { CalendarEvent, CalendarEventGroup } from './types';

interface CalendarLargeViewProps {
  dayGroups: CalendarEventGroup[];
  textPrimary: string;
  textSecondary: string;
  hoverText: string;
  hoverBg: string;
  dividerColor: string;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarLargeView({
  dayGroups,
  textPrimary,
  textSecondary,
  hoverText,
  hoverBg,
  dividerColor,
  onEventClick,
}: CalendarLargeViewProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <CalendarAgendaList
        dayGroups={dayGroups}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        hoverText={hoverText}
        hoverBg={hoverBg}
        dividerColor={dividerColor}
        density="compact"
        onEventClick={onEventClick}
      />
    </div>
  );
}
