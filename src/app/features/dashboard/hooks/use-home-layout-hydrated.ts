import type { CustomCard } from '../stores/custom-cards-store';

interface UseHomeLayoutHydratedParams {
  cardIds: string[];
  availableDeviceMap: Map<string, unknown>;
  allCustomCards: CustomCard[];
}

export function useHomeLayoutHydrated({
  cardIds: _cardIds,
  availableDeviceMap: _availableDeviceMap,
  allCustomCards: _allCustomCards,
}: UseHomeLayoutHydratedParams) {
  // Stale imports can contain card ids from another Home Assistant instance or demo data.
  // The Home overview filters unavailable ids while rendering, so a stale layout should
  // not block the whole dashboard behind the recovery error.
  return true;
}
