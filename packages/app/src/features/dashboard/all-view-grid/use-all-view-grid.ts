import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { ALL_ROOMS_ID, HOME_WIDGET_ROOM, isAllRooms } from '@navet/app/constants/rooms';
import { useI18n, useIntegrationStore, useSearch } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import { useCallback, useDeferredValue, useMemo } from 'react';
import type { CustomCard } from '../stores/custom-cards-store';
import { buildPreparedDashboardDevices } from '../utils/prepared-dashboard-devices';
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
  const providerSessions = useIntegrationStore(integrationSelectors.providerSessions);
  const connectedProviderCount = Object.keys(providerSessions).length;
  const { isSearchActive, filteredDeviceIds } = useSearch();
  const deferredFilteredDeviceIds = useDeferredValue(filteredDeviceIds);
  const preparedDevices = useMemo(
    () => buildPreparedDashboardDevices(deviceMap, t, connectedProviderCount),
    [connectedProviderCount, deviceMap, t]
  );
  const preparedDeviceMap = useMemo(
    () => new Map(preparedDevices.map((device) => [device.id, device])),
    [preparedDevices]
  );

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

    for (const preparedDevice of preparedDevices) {
      if (isSearchActive && !filteredDeviceIdMap[preparedDevice.id]) {
        continue;
      }

      const device = preparedDevice.device;
      const room = preparedDevice.room;
      if (!grouped[room]) {
        grouped[room] = [];
      }
      grouped[room].push(device);
    }

    return grouped;
  }, [filteredDeviceIdMap, isSearchActive, preparedDevices]);

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

        const preparedDevice = preparedDeviceMap.get(id);
        if (!preparedDevice) {
          continue;
        }

        const title = preparedDevice.typeLabel;
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
        if (isAllRooms(left.room)) return -1;
        if (isAllRooms(right.room)) return 1;
        return left.room.localeCompare(right.room);
      });
    }

    return visibleEntries.map((entry) => ({
      key: `room:${entry.room}`,
      title: entry.room === ALL_ROOMS_ID ? t('dashboard.sections.widgets') : entry.room,
      orderedIds: entry.orderedIds,
      totalItems: entry.totalItems,
      mutedTitle: entry.room === UNKNOWN_ROOM_LABEL,
    }));
  }, [allOrderedIds, customCardMap, grouping, orderedRoomEntries, preparedDeviceMap, t]);

  return {
    customCardMap,
    handleSizeChange,
    roomSections,
  };
}
