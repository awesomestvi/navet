import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOME_WIDGET_ROOM, isAllRooms } from '@/app/constants/rooms';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import type { Device, DeviceCollection } from '@/app/types/device.types';
import { getDeviceRoomLabel } from '@/app/utils/device-location';
import {
  notifyPersistedStateChanged,
  PERSISTED_STATE_EVENT,
} from '@/app/utils/persisted-state-events';
import { ensureCanonicalEntityId } from '@/app/utils/provider-entity-id';
import { storage } from '@/app/utils/storage';
import type { CustomCard } from './use-custom-cards';

function areRoomOrdersEqual(
  left: Record<string, string[]>,
  right: Record<string, string[]>
): boolean {
  const leftRooms = Object.keys(left);
  const rightRooms = Object.keys(right);

  if (leftRooms.length !== rightRooms.length) {
    return false;
  }

  return rightRooms.every((room) => {
    const leftOrder = left[room] ?? [];
    const rightOrder = right[room] ?? [];

    return (
      leftOrder.length === rightOrder.length &&
      leftOrder.every((id, index) => id === rightOrder[index])
    );
  });
}

export const useCardOrdering = (
  devices: DeviceCollection,
  rooms: string[],
  customCards: CustomCard[] = []
) => {
  const normalizeOrderIds = useCallback(
    (ids: string[]) => ids.map((id) => ensureCanonicalEntityId(id)),
    []
  );
  const safeCustomCards = Array.isArray(customCards) ? customCards : [];

  // Extract only id+room — stable across HA state-only updates (brightness, temperature, etc.)
  const deviceIdRoomPairs = useMemo(() => {
    const pairs: { id: string; room: string }[] = [];
    Object.values(devices).forEach((deviceArray) => {
      (deviceArray as Device[]).forEach((device: Device) => {
        pairs.push({ id: device.id, room: getDeviceRoomLabel(device) });
      });
    });
    return pairs;
  }, [devices]);

  // Stable string key — only changes when device ids or room assignments change.
  // This gates ordering rebuilds so HA state-only updates (temp, brightness) don't trigger them.
  const deviceIdentityKey = useMemo(
    () => deviceIdRoomPairs.map((p) => `${p.id}:${p.room}`).join(','),
    [deviceIdRoomPairs]
  );

  // Keep a ref so buildOrders can read the latest pairs without having them as a dep.
  // This avoids rebuilding buildOrders on every devices reference change.
  const deviceIdRoomPairsRef = useRef(deviceIdRoomPairs);
  deviceIdRoomPairsRef.current = deviceIdRoomPairs;

  // biome-ignore lint/correctness/useExhaustiveDependencies: deviceIdentityKey gates recreation so ordering only rebuilds when device ids/rooms change, not on every HA state update. Pairs are read via ref (always current).
  const buildOrders = useCallback(() => {
    const pairs = deviceIdRoomPairsRef.current;
    const orders: Record<string, string[]> = {};
    const orderedRooms = Array.from(
      new Set([
        ...rooms,
        ...safeCustomCards.map((card) => card.room).filter((room) => room !== HOME_WIDGET_ROOM),
      ])
    );

    orderedRooms.forEach((room) => {
      const roomCards: string[] = [];
      pairs.forEach(({ id, room: deviceRoom }) => {
        if (deviceRoom === room) {
          roomCards.push(id);
        }
      });
      safeCustomCards.forEach((card) => {
        if (card.room === room || isAllRooms(card.room)) {
          roomCards.push(card.id);
        }
      });
      orders[room] = roomCards;
    });

    return orders;
  }, [deviceIdentityKey, rooms, safeCustomCards]);

  const [cardOrders, setCardOrders] = useState<Record<string, string[]>>(() => {
    const stored = storage.get<Record<string, string[]> | null>(STORAGE_KEYS.cardOrders, null);
    if (stored) {
      const allDeviceIds = new Set(deviceIdRoomPairs.map((p) => p.id));
      safeCustomCards.forEach((card) => {
        allDeviceIds.add(card.id);
      });
      const normalizedStored = Object.fromEntries(
        Object.entries(stored).map(([room, orderArray]) => [
          room,
          Array.isArray(orderArray) ? normalizeOrderIds(orderArray) : [],
        ])
      );
      const isValid = Object.values(stored).every(
        (orderArray) =>
          Array.isArray(orderArray) &&
          normalizeOrderIds(orderArray).every(
            (id) => typeof id === 'string' && allDeviceIds.has(id)
          )
      );
      if (isValid) {
        return normalizedStored;
      }
    }

    return buildOrders();
  });

  useEffect(() => {
    const allDeviceIds = new Set(deviceIdRoomPairsRef.current.map((p) => p.id));
    safeCustomCards.forEach((card) => {
      allDeviceIds.add(card.id);
    });

    setCardOrders((prev) => {
      const next = buildOrders();
      const mergedOrders: Record<string, string[]> = {};
      const allRooms = new Set([...Object.keys(prev), ...Object.keys(next)]);

      allRooms.forEach((room) => {
        const order = prev[room];
        if (!Array.isArray(order)) {
          mergedOrders[room] = next[room] ?? [];
          return;
        }

        const roomOrder = next[room] ?? [];
        const validRoomIds = new Set(roomOrder);
        const preserved = order.filter((id) => allDeviceIds.has(id) && validRoomIds.has(id));
        const additions = roomOrder.filter((id) => !preserved.includes(id));
        mergedOrders[room] = [...preserved, ...additions];
      });

      const prevRooms = Object.keys(prev);
      const nextRooms = Object.keys(mergedOrders);
      const changed =
        prevRooms.length !== nextRooms.length ||
        nextRooms.some((room) => {
          const previousOrder = prev[room] ?? [];
          const nextOrder = mergedOrders[room] ?? [];

          return (
            previousOrder.length !== nextOrder.length ||
            previousOrder.some((id, index) => id !== nextOrder[index])
          );
        });

      if (!changed) {
        return prev;
      }

      return mergedOrders;
    });
  }, [buildOrders, safeCustomCards]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.cardOrders, cardOrders);
    notifyPersistedStateChanged(STORAGE_KEYS.cardOrders, cardOrders);
  }, [cardOrders]);

  useEffect(() => {
    const handlePersistedState = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: Record<string, string[]> }>;
      if (customEvent.detail?.key !== STORAGE_KEYS.cardOrders) {
        return;
      }

      const nextValue = customEvent.detail.value ?? {};
      const normalizedValue = Object.fromEntries(
        Object.entries(nextValue).map(([room, orderArray]) => [
          room,
          Array.isArray(orderArray) ? normalizeOrderIds(orderArray) : [],
        ])
      );

      setCardOrders((previous) =>
        areRoomOrdersEqual(previous, normalizedValue) ? previous : normalizedValue
      );
    };

    window.addEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);

    return () => {
      window.removeEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
    };
  }, [normalizeOrderIds]);

  return { cardOrders };
};
