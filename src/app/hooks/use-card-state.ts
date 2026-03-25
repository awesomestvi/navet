import { useCallback, useEffect, useState } from 'react';
import type { CardSize } from '../components/shared/card-size-selector';
import { STORAGE_KEYS } from '../constants/storage-keys';
import type { DeviceCollection } from '../types/device.types';
import { storage } from '../utils/storage';

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
      return stored;
    }

    // Default: use sizes from devices
    return Object.fromEntries(
      Object.values(devices)
        .flat()
        .map((device) => [device.id, device.size])
    );
  });

  // Persist to localStorage whenever cardSizes changes
  useEffect(() => {
    storage.set(STORAGE_KEYS[storageKey], cardSizes);
  }, [cardSizes, storageKey]);

  const updateCardSize = useCallback((id: string, size: CardSize) => {
    setCardSizes((prev) => ({ ...prev, [id]: size }));
  }, []);

  return { cardSizes, updateCardSize };
};
