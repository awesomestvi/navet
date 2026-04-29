import { useMemo } from 'react';
import { homeAssistantSelectors } from '../stores/selectors';
import { useHomeAssistant } from './use-home-assistant';

export function useAreaRooms(): string[] {
  const areas = useHomeAssistant(homeAssistantSelectors.areas);

  return useMemo(
    () =>
      [...new Set(areas.map((area) => area.name.trim()).filter((name) => name.length > 0))].sort(
        (left, right) => left.localeCompare(right)
      ),
    [areas]
  );
}
