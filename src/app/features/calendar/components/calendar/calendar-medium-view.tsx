import { CalendarAgendaList } from './calendar-primitives';
import type { CalendarEvent, CalendarEventGroup } from './types';

interface CalendarMediumViewProps {
  dayGroups: CalendarEventGroup[];
  textPrimary: string;
  hoverText: string;
  textSecondary: string;
  hoverBg: string;
  dividerColor: string;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarMediumView({
  dayGroups,
  textPrimary,
  hoverText,
  textSecondary,
  hoverBg,
  dividerColor,
  onEventClick,
}: CalendarMediumViewProps) {
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
