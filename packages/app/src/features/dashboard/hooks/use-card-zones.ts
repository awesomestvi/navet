import { useCallback } from 'react';
import { useCardZonesStore } from '../stores/card-zones-store';
import type { ZoneName } from '../zones/zone-types';

/**
 * Zone overrides are stored separately from card records so that
 * auto-discovered HA entity cards (which live only in the HA store)
 * can also have explicit zone assignments.
 */
export function useCardZones() {
  const cardZones = useCardZonesStore((state) => state.cardZones);
  const updateStoredCardZone = useCardZonesStore((state) => state.updateCardZone);

  const updateCardZone = useCallback(
    (id: string, zone: ZoneName) => updateStoredCardZone(id, zone),
    [updateStoredCardZone]
  );

  return { cardZones, updateCardZone };
}
