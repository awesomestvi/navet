import { useCallback, useDeferredValue, useMemo } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getDeviceTypeLabel } from '@/app/constants/device-type-labels';
import { useI18n, useSearch } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import { getDeviceRoomLabel, UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';
import { type CustomCard, HOME_WIDGET_ROOM } from '../stores/custom-cards-store';
import type { AllViewGrouping, AllViewSectionData } from './types';

interface UseAllViewGridParams {
  cardOrders: Record<string, string[]>;
  customCards: CustomCard[];
  deviceMap: Map<string, DeviceWithType>;
  grouping: AllViewGrouping;
  rooms: string[];
  updateCardSize: (id: string, size: CardSize) => void;
}

export function useAllViewGrid({
  cardOrders,
  customCards,
  deviceMap,
  grouping,
  rooms,
  updateCardSize,
}: UseAllViewGridParams) {
  const { t } = useI18n();
  const { isSearchActive, filteredDeviceIds } = useSearch();
  const deferredFilteredDeviceIds = useDeferredValue(filteredDeviceIds);

  const handleSizeChange = useCallback(
    (id: string, size: CardSize) => {
      updateCardSize(id, size);
    },
    [updateCardSize]
  );

  // Use plain object for O(1) lookups instead of Set to avoid Set construction cost
  const filteredDeviceIdMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const id of deferredFilteredDeviceIds) {
      map[id] = true;
    }
    return map;
  }, [deferredFilteredDeviceIds]);

  const devicesByRoom = useMemo(() => {
    const grouped: Record<string, DeviceWithType[]> = {};

    deviceMap.forEach((device) => {
      if (isSearchActive && !filteredDeviceIdMap[device.id]) {
        return;
      }

      const room = getDeviceRoomLabel(device);
      if (!grouped[room]) {
        grouped[room] = [];
      }
      grouped[room].push(device);
    });

    return grouped;
  }, [deviceMap, filteredDeviceIdMap, isSearchActive]);

  const customCardsByRoom = useMemo(() => {
    const grouped: Record<string, CustomCard[]> = {};

    for (const card of customCards) {
      if (!card.room) {
        continue;
      }

      if (!grouped[card.room]) {
        grouped[card.room] = [];
      }
      grouped[card.room].push(card);
    }

    return grouped;
  }, [customCards]);

  // Build custom card map using loop instead of .map() for better performance
  const customCardMap = useMemo(() => {
    const map = new Map<string, CustomCard>();
    for (const card of customCards) {
      map.set(card.id, card);
    }
    return map;
  }, [customCards]);

  const orderedRoomEntries = useMemo(() => {
    // Build room set using loop to avoid multiple array iterations
    const roomSet: Record<string, boolean> = {};
    for (const room of rooms) {
      roomSet[room] = true;
    }
    for (const card of customCards) {
      if (card.room && card.room !== HOME_WIDGET_ROOM) {
        roomSet[card.room] = true;
      }
    }
    const orderedRooms = Object.keys(roomSet);

    return orderedRooms.map((room) => {
      const roomDevices = devicesByRoom[room] || [];
      const roomCustomCards = customCardsByRoom[room] || [];

      // Build valid ID set using loop for better performance
      const validIds: Record<string, boolean> = {};
      let totalItems = 0;

      for (const device of roomDevices) {
        validIds[device.id] = true;
        totalItems++;
      }
      for (const card of roomCustomCards) {
        if (!validIds[card.id]) {
          validIds[card.id] = true;
          totalItems++;
        }
      }

      const orderedIds = (cardOrders[room] || []).filter((id) => validIds[id]);

      return {
        room,
        orderedIds,
        totalItems,
      };
    });
  }, [cardOrders, customCards, customCardsByRoom, devicesByRoom, rooms]);

  const allOrderedIds = useMemo(
    () => orderedRoomEntries.flatMap((entry) => entry.orderedIds),
    [orderedRoomEntries]
  );

  const roomSections = useMemo<AllViewSectionData[]>(() => {
    if (grouping === 'none') {
      return allOrderedIds.length > 0
        ? [
            {
              key: 'all-items',
              title: t('dashboard.sections.allItems'),
              orderedIds: allOrderedIds,
              totalItems: allOrderedIds.length,
              showHeader: false,
            },
          ]
        : [];
    }

    if (grouping === 'type') {
      // Use plain object instead of Map for better performance
      const grouped: Record<string, string[]> = {};

      for (const id of allOrderedIds) {
        const customCard = customCardMap.get(id);
        if (customCard) {
          const widgetsTitle = t('dashboard.sections.widgets');
          if (!grouped[widgetsTitle]) {
            grouped[widgetsTitle] = [];
          }
          grouped[widgetsTitle].push(id);
          continue;
        }

        const device = deviceMap.get(id);
        if (!device) {
          continue;
        }

        const title = getDeviceTypeLabel(device.type, t);
        if (!grouped[title]) {
          grouped[title] = [];
        }
        grouped[title].push(id);
      }

      const titles = Object.keys(grouped).sort((left, right) => left.localeCompare(right));
      return titles.map((title) => ({
        key: `type:${title}`,
        title,
        orderedIds: grouped[title],
        totalItems: grouped[title].length,
      }));
    }

    const visibleEntries = orderedRoomEntries.filter((entry) => entry.totalItems > 0);

    if (grouping === 'room') {
      // Sort in-place to avoid creating new array
      visibleEntries.sort((left, right) => {
        if (left.room === 'All') return -1;
        if (right.room === 'All') return 1;
        return left.room.localeCompare(right.room);
      });
    }

    return visibleEntries.map((entry) => ({
      key: `room:${entry.room}`,
      title: entry.room === 'All' ? t('dashboard.sections.widgets') : entry.room,
      orderedIds: entry.orderedIds,
      totalItems: entry.totalItems,
      mutedTitle: entry.room === UNKNOWN_ROOM_LABEL,
    }));
  }, [allOrderedIds, customCardMap, deviceMap, grouping, orderedRoomEntries, t]);

  return {
    customCardMap,
    handleSizeChange,
    roomSections,
  };
}
