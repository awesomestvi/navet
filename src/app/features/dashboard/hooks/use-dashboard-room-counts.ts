import { useCallback, useMemo } from 'react';
import type { DeviceCollection } from '@/app/types/device.types';

export function useDashboardRoomCounts(allDevices: DeviceCollection, devices: DeviceCollection) {
  const countItemsByRoom = useCallback((collection: DeviceCollection) => {
    const counts = new Map<string, number>();
    const deviceGroups = Object.values(collection) as Array<Array<{ room: string }>>;

    deviceGroups.forEach((group) => {
      group.forEach((device) => {
        const room = device.room;
        if (!room || room === 'All') {
          return;
        }

        counts.set(room, (counts.get(room) ?? 0) + 1);
      });
    });

    return counts;
  }, []);

  const roomItemCounts = useMemo(
    () => countItemsByRoom(allDevices),
    [allDevices, countItemsByRoom]
  );

  const visibleRoomItemCounts = useMemo(
    () => countItemsByRoom(devices),
    [countItemsByRoom, devices]
  );

  const roomHiddenItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    roomItemCounts.forEach((totalCount, room) => {
      const visibleCount = visibleRoomItemCounts.get(room) ?? 0;
      const hiddenCount = Math.max(0, totalCount - visibleCount);
      if (hiddenCount > 0) {
        counts.set(room, hiddenCount);
      }
    });
    return counts;
  }, [roomItemCounts, visibleRoomItemCounts]);

  return {
    roomItemCounts,
    visibleRoomItemCounts,
    roomHiddenItemCounts,
  };
}
