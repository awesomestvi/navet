import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoom } from '@navet/app/utils/device-location';
import { normalizeRoomName, roomNamesMatch } from '@navet/app/utils/room-name';
import { useMemo } from 'react';

interface UseDashboardDerivedStateParams {
  activeRoom: string;
  absorbedEntityIds?: string[];
  includeLightState?: boolean;
  includeOrderedCardIds?: boolean;
  availableDeviceMap: Map<string, DeviceWithType>;
  cardOrders: Record<string, string[]>;
  deviceMap: Map<string, DeviceWithType>;
  hiddenEntityIds: string[];
  rooms: string[];
}

export function useDashboardDerivedState({
  activeRoom,
  absorbedEntityIds = [],
  includeLightState = true,
  includeOrderedCardIds = true,
  availableDeviceMap,
  cardOrders,
  deviceMap,
  hiddenEntityIds,
  rooms,
}: UseDashboardDerivedStateParams) {
  const allEntityIds = useMemo(() => Array.from(availableDeviceMap.keys()), [availableDeviceMap]);
  const absorbedEntityIdSet = useMemo(() => new Set(absorbedEntityIds), [absorbedEntityIds]);
  const addableEntityIds = useMemo(
    () =>
      (hiddenEntityIds.length > 0 ? hiddenEntityIds : allEntityIds).filter(
        (entityId) => !absorbedEntityIdSet.has(entityId)
      ),
    [absorbedEntityIdSet, allEntityIds, hiddenEntityIds]
  );

  const lightDeviceMap = useMemo(
    () =>
      includeLightState
        ? new Map(Array.from(deviceMap.entries()).filter(([, device]) => device.type === 'lights'))
        : new Map<string, DeviceWithType>(),
    [deviceMap, includeLightState]
  );

  const lightRooms = useMemo(() => {
    const roomsWithLights = new Set<string>();
    lightDeviceMap.forEach((device) => {
      const room = getDeviceRoom(device);
      if (room) {
        roomsWithLights.add(normalizeRoomName(room));
      }
    });
    return rooms.filter((room) => roomsWithLights.has(normalizeRoomName(room)));
  }, [lightDeviceMap, rooms]);

  const orderedCardIds = useMemo(
    () =>
      includeOrderedCardIds
        ? Array.from(
            new Set(
              Object.entries(cardOrders)
                .filter(([room]) => roomNamesMatch(room, activeRoom))
                .flatMap(([, ids]) => ids)
            )
          )
        : [],
    [activeRoom, cardOrders, includeOrderedCardIds]
  );

  return {
    addableEntityIds,
    allEntityIds,
    lightDeviceMap,
    lightRooms,
    orderedCardIds,
  };
}
