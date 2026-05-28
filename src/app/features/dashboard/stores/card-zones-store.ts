import { create } from 'zustand';
import { type PersistStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { ensureCanonicalEntityId } from '@/app/utils/provider-entity-id';
import { ZONE_ORDERED, type ZoneName } from '../zones/zone-types';

interface CardZonesStore {
  cardZones: Record<string, ZoneName>;
  replaceCardZones: (cardZones: Record<string, unknown>) => void;
  updateCardZone: (id: string, zone: ZoneName) => void;
}

type PersistedCardZonesState = Pick<CardZonesStore, 'cardZones'>;

const VALID_ZONES = new Set<ZoneName>(ZONE_ORDERED);

const cardZonesStorage: PersistStorage<PersistedCardZonesState> = {
  getItem: (name) => {
    const item = localStorage.getItem(name);
    if (!item) {
      return null;
    }

    try {
      const parsed = JSON.parse(item) as unknown;

      if (parsed && typeof parsed === 'object' && 'state' in parsed) {
        return parsed as { state: PersistedCardZonesState; version?: number };
      }

      return {
        state: {
          cardZones: normalizeCardZones(parsed),
        },
        version: 0,
      };
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

function normalizeCardZones(value: unknown): Record<string, ZoneName> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, ZoneName] =>
          typeof entry[0] === 'string' &&
          typeof entry[1] === 'string' &&
          VALID_ZONES.has(entry[1] as ZoneName)
      )
      .map(([id, zone]) => [ensureCanonicalEntityId(id), zone])
  );
}

function getPersistedCardZones(value: unknown): Record<string, ZoneName> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  if ('cardZones' in value) {
    return normalizeCardZones((value as { cardZones?: unknown }).cardZones);
  }

  return normalizeCardZones(value);
}

export const useCardZonesStore = create<CardZonesStore>()(
  persist(
    (set) => ({
      cardZones: {},
      replaceCardZones: (cardZones) => set({ cardZones: normalizeCardZones(cardZones) }),
      updateCardZone: (id, zone) =>
        set((state) => ({
          cardZones: {
            ...state.cardZones,
            [ensureCanonicalEntityId(id)]: zone,
          },
        })),
    }),
    {
      name: STORAGE_KEYS.cardZones,
      storage: cardZonesStorage,
      partialize: (state) => ({ cardZones: state.cardZones }),
      merge: (persisted, current) => ({
        ...current,
        cardZones: getPersistedCardZones(persisted),
      }),
    }
  )
);
