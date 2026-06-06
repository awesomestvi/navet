import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardSize } from '../components/shared/card-size-selector';
import { STORAGE_KEYS } from '../constants/storage-keys';
import type { DeviceCollection } from '../types/device.types';
import {
  notifyPersistedStateChanged,
  PERSISTED_STATE_EVENT,
} from '../utils/persisted-state-events';
import { normalizePersistedEntityRecord } from '../utils/provider-entity-id';
import { storage } from '../utils/storage';

const CALENDAR_ALLOWED_SIZES: CardSize[] = ['small', 'medium', 'large'];
const LOCK_ALLOWED_SIZES: CardSize[] = ['extra-small', 'small'];

function areCardSizeRecordsEqual(
  left: Record<string, CardSize>,
  right: Record<string, CardSize>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return rightKeys.every((key) => left[key] === right[key]);
}

function normalizeCardSize(
  id: string,
  size: CardSize,
  constrainedIds: {
    calendarIds: Set<string>;
    lockIds: Set<string>;
  }
): CardSize {
  const isCalendarCard = constrainedIds.calendarIds.has(id);
  const isLockCard = constrainedIds.lockIds.has(id);

  if (isCalendarCard && !CALENDAR_ALLOWED_SIZES.includes(size)) {
    return 'large';
  }

  if (isLockCard && !LOCK_ALLOWED_SIZES.includes(size)) {
    return 'small';
  }

  return size;
}

function normalizeCardSizes(
  cardSizes: Record<string, CardSize>,
  constrainedIds: {
    calendarIds: Set<string>;
    lockIds: Set<string>;
  }
): Record<string, CardSize> {
  let changed = false;

  const normalizedEntries = Object.entries(cardSizes).map(([id, size]) => {
    const normalizedSize = normalizeCardSize(id, size, constrainedIds);
    if (normalizedSize !== size) {
      changed = true;
    }

    return [id, normalizedSize];
  });

  return changed ? Object.fromEntries(normalizedEntries) : cardSizes;
}

/**
 * Custom hook for managing card sizes across all devices
 * Encapsulates card size state management logic with localStorage persistence
 */
export const useCardState = (
  devices: DeviceCollection,
  storageKey: keyof typeof STORAGE_KEYS = 'cardSizes'
) => {
  const constrainedIds = useMemo(
    () => ({
      calendarIds: new Set(devices.calendars.map((device) => device.id)),
      lockIds: new Set(devices.locks.map((device) => device.id)),
    }),
    [devices.calendars, devices.locks]
  );
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>(() => {
    const stored = storage.get<Record<string, CardSize> | null>(STORAGE_KEYS[storageKey], null);
    if (stored) {
      return normalizeCardSizes(normalizePersistedEntityRecord(stored), {
        calendarIds: new Set(devices.calendars.map((device) => device.id)),
        lockIds: new Set(devices.locks.map((device) => device.id)),
      });
    }

    // Default: use sizes from devices
    return normalizeCardSizes(
      Object.fromEntries(
        Object.values(devices)
          .flat()
          .map((device) => [device.id, device.size])
      ),
      {
        calendarIds: new Set(devices.calendars.map((device) => device.id)),
        lockIds: new Set(devices.locks.map((device) => device.id)),
      }
    );
  });

  // Persist to localStorage whenever cardSizes changes
  useEffect(() => {
    storage.set(STORAGE_KEYS[storageKey], cardSizes);
    notifyPersistedStateChanged(STORAGE_KEYS[storageKey], cardSizes);
  }, [cardSizes, storageKey]);

  useEffect(() => {
    setCardSizes((prev) => normalizeCardSizes(prev, constrainedIds));
  }, [constrainedIds]);

  useEffect(() => {
    const handlePersistedState = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: Record<string, CardSize> }>;
      if (customEvent.detail?.key !== STORAGE_KEYS[storageKey]) {
        return;
      }

      const normalizedValue = normalizeCardSizes(
        normalizePersistedEntityRecord(customEvent.detail.value ?? {}),
        constrainedIds
      );

      setCardSizes((previous) =>
        areCardSizeRecordsEqual(previous, normalizedValue) ? previous : normalizedValue
      );
    };

    window.addEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);

    return () => {
      window.removeEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
    };
  }, [constrainedIds, storageKey]);

  const updateCardSize = useCallback(
    (id: string, size: CardSize) => {
      setCardSizes((prev) => ({ ...prev, [id]: normalizeCardSize(id, size, constrainedIds) }));
    },
    [constrainedIds]
  );

  return { cardSizes, updateCardSize };
};
