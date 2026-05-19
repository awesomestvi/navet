import { OverlayScrollArea } from '@/app/components/primitives';
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
    <OverlayScrollArea className="flex-1" contentClassName="pr-3" scrollbarStartInset={56}>
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
    </OverlayScrollArea>
  );
}
