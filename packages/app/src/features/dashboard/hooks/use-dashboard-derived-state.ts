import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoom } from '@navet/app/utils/device-location';
import { useMemo } from 'react';

interface UseDashboardDerivedStateParams {
  activeRoom: string;
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
  includeLightState = true,
  includeOrderedCardIds = true,
  availableDeviceMap,
  cardOrders,
  deviceMap,
  hiddenEntityIds,
  rooms,
}: UseDashboardDerivedStateParams) {
  const allEntityIds = useMemo(() => Array.from(availableDeviceMap.keys()), [availableDeviceMap]);
  const addableEntityIds = useMemo(
    () => (hiddenEntityIds.length > 0 ? hiddenEntityIds : allEntityIds),
    [allEntityIds, hiddenEntityIds]
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
        roomsWithLights.add(room);
      }
    });
    return rooms.filter((room) => roomsWithLights.has(room));
  }, [lightDeviceMap, rooms]);

  const orderedCardIds = includeOrderedCardIds ? cardOrders[activeRoom] || [] : [];

  return {
    addableEntityIds,
    allEntityIds,
    lightDeviceMap,
    lightRooms,
    orderedCardIds,
  };
}
