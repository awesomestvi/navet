import { HOME_WIDGET_ROOM, isAllRooms } from '@navet/app/constants/rooms';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { useMemo } from 'react';
import type { CustomCard } from '../stores/custom-cards-store';
import { resolveCardZone } from './resolve-card-zone';
import { ZONE_ORDERED, type ZoneName } from './zone-types';

export interface ZoneSection {
  zone: ZoneName;
  orderedIds: string[];
}

/**
 * Partitions all home-screen cards into named zones.
 *
 * Device cards are bucketed by device type (or stored zone override).
 * Custom cards assigned to the home screen are included, bucketed by card type
 * (or stored zone override on the card or in cardZones).
 *
 * Only zones that contain at least one card are returned.
 */
export function useZoneLayout(
  deviceMap: Map<string, DeviceWithType>,
  customCards: CustomCard[],
  cardZones: Record<string, ZoneName>
): ZoneSection[] {
  return useMemo(() => {
    const buckets = new Map<ZoneName, string[]>(ZONE_ORDERED.map((z) => [z, []]));

    const push = (zone: ZoneName, id: string) => {
      const bucket = buckets.get(zone);
      if (bucket) bucket.push(id);
    };

    // Device cards — all devices in the current room's deviceMap
    for (const [id, device] of deviceMap) {
      push(resolveCardZone(device.type, cardZones[id]), id);
    }

    // Custom widget cards — only those assigned to the home screen
    for (const card of customCards) {
      if (!isAllRooms(card.room) && card.room !== HOME_WIDGET_ROOM) continue;
      push(resolveCardZone(card.type, card.zone ?? cardZones[card.id]), card.id);
    }

    return ZONE_ORDERED.map((z) => ({ zone: z, orderedIds: buckets.get(z) ?? [] })).filter(
      (s) => s.orderedIds.length > 0
    );
  }, [deviceMap, customCards, cardZones]);
}
