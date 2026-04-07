import { useCallback, useEffect, useState } from 'react';
import type { CardSize } from '../components/shared/card-size-selector';
import { STORAGE_KEYS } from '../constants/storage-keys';
import type { DeviceCollection } from '../types/device.types';
import { storage } from '../utils/storage';

const CALENDAR_ALLOWED_SIZES: CardSize[] = ['small', 'medium', 'large'];
const LOCK_ALLOWED_SIZES: CardSize[] = ['tiny', 'extra-small', 'small'];

function normalizeCardSize(id: string, size: CardSize, devices: DeviceCollection): CardSize {
  const isCalendarCard = devices.calendars.some((device) => device.id === id);
  const isLockCard = devices.locks.some((device) => device.id === id);

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
  devices: DeviceCollection
): Record<string, CardSize> {
  let changed = false;

  const normalizedEntries = Object.entries(cardSizes).map(([id, size]) => {
    const normalizedSize = normalizeCardSize(id, size, devices);
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
  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>(() => {
    const stored = storage.get<Record<string, CardSize> | null>(STORAGE_KEYS[storageKey], null);
    if (stored) {
      return normalizeCardSizes(stored, devices);
    }

    // Default: use sizes from devices
    return normalizeCardSizes(
      Object.fromEntries(
        Object.values(devices)
          .flat()
          .map((device) => [device.id, device.size])
      ),
      devices
    );
  });

  // Persist to localStorage whenever cardSizes changes
  useEffect(() => {
    storage.set(STORAGE_KEYS[storageKey], cardSizes);
  }, [cardSizes, storageKey]);

  useEffect(() => {
    setCardSizes((prev) => normalizeCardSizes(prev, devices));
  }, [devices]);

  const updateCardSize = useCallback(
    (id: string, size: CardSize) => {
      setCardSizes((prev) => ({ ...prev, [id]: normalizeCardSize(id, size, devices) }));
    },
    [devices]
  );

  return { cardSizes, updateCardSize };
};
