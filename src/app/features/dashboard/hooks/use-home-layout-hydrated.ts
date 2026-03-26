import { useMemo } from 'react';
import type { CustomCard } from '../stores/custom-cards-store';

interface UseHomeLayoutHydratedParams {
  cardIds: string[];
  availableDeviceMap: Map<string, unknown>;
  allCustomCards: CustomCard[];
}

export function useHomeLayoutHydrated({
  cardIds,
  availableDeviceMap,
  allCustomCards,
}: UseHomeLayoutHydratedParams) {
  return useMemo(() => {
    if (cardIds.length === 0) {
      return true;
    }

    // Use availableDeviceMap (all HA entities, unfiltered by hidden state) so that a blank
    // dashboard with all entities hidden does not block hydration indefinitely.
    const availableIdSet = new Set([
      ...availableDeviceMap.keys(),
      ...allCustomCards.map((card) => card.id),
    ]);
    if (availableIdSet.size === 0) {
      return true;
    }

    return cardIds.every((cardId) => availableIdSet.has(cardId));
  }, [cardIds, availableDeviceMap, allCustomCards]);
}
