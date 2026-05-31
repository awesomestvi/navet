import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { ALL_ROOMS_ID, isAllRooms } from '@navet/app/constants/rooms';
import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  readLocalStorageWithMigration,
  removeLocalStorageWithMigration,
  writeLocalStorageWithMigration,
} from '@navet/app/utils/local-storage-migration';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export { ENERGY_WIDGET_ROOM, HOME_WIDGET_ROOM } from '@navet/app/constants/rooms';

import type { ZoneName } from '../zones/zone-types';

export type CardType =
  | 'info'
  | 'rss'
  | 'photo'
  | 'note'
  | 'battery'
  | 'ups'
  | 'energy-now'
  | 'button'
  | 'map';

export interface CustomCard {
  id: string;
  type: CardType;
  size: CardSize;
  room: string;
  /** Explicit zone assignment for home-screen zone layout. Undefined = default by card type. */
  zone?: ZoneName;
  data?: Record<string, unknown>;
  createdAt: number;
}

type LegacyCardType = CardType | 'sensor-group';
type NormalizableCustomCard = Omit<CustomCard, 'type'> & { type: LegacyCardType };

function normalizeInfoCardData(data: Record<string, unknown> | undefined) {
  if (!data) {
    return data;
  }

  const sensorEntityIds = Array.isArray(data.sensorEntityIds)
    ? data.sensorEntityIds.filter((value): value is string => typeof value === 'string')
    : [];
  const legacyEntityId = typeof data.entityId === 'string' ? data.entityId : undefined;
  const normalizedSensorEntityIds =
    sensorEntityIds.length > 0
      ? sensorEntityIds
      : legacyEntityId
        ? [legacyEntityId]
        : sensorEntityIds;

  if (
    normalizedSensorEntityIds.length === sensorEntityIds.length &&
    normalizedSensorEntityIds.every((value, index) => value === sensorEntityIds[index]) &&
    !legacyEntityId
  ) {
    return data;
  }

  return {
    ...data,
    sensorEntityIds: normalizedSensorEntityIds,
    entityId: legacyEntityId,
  };
}

export function normalizeCustomCard(card: NormalizableCustomCard): CustomCard {
  const normalizedType = card.type === 'sensor-group' ? 'info' : card.type;
  const normalizedData = normalizedType === 'info' ? normalizeInfoCardData(card.data) : card.data;
  const normalizedCard =
    normalizedType === card.type && normalizedData === card.data
      ? (card as CustomCard)
      : { ...card, type: normalizedType, data: normalizedData };

  if (
    normalizedCard.type === 'photo' &&
    normalizedCard.size !== 'small' &&
    normalizedCard.size !== 'medium' &&
    normalizedCard.size !== 'large' &&
    normalizedCard.size !== 'extra-large'
  ) {
    return { ...normalizedCard, size: 'large' };
  }

  if (
    normalizedCard.type === 'note' &&
    normalizedCard.size !== 'small' &&
    normalizedCard.size !== 'medium' &&
    normalizedCard.size !== 'large' &&
    normalizedCard.size !== 'extra-large'
  ) {
    return { ...normalizedCard, size: 'medium' };
  }

  if (
    normalizedCard.type === 'info' &&
    normalizedCard.size !== 'small' &&
    normalizedCard.size !== 'medium' &&
    normalizedCard.size !== 'large'
  ) {
    return { ...normalizedCard, size: 'medium' };
  }

  return normalizedCard;
}

interface CustomCardsState {
  cards: CustomCard[];
  replaceCards: (cards: CustomCard[]) => void;
  addCard: (
    type: CardType,
    size: CardSize,
    room: string,
    data?: Record<string, unknown>
  ) => CustomCard;
  removeCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
  getCardsForRoom: (room: string) => CustomCard[];
}

export const useCustomCardsStore = create<CustomCardsState>()(
  persist(
    (set, get) => ({
      cards: [],
      replaceCards: (cards) => set({ cards: cards.map(normalizeCustomCard) }),
      addCard: (type, size, room, data) => {
        const newCard = normalizeCustomCard({
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          size,
          room,
          data,
          createdAt: Date.now(),
        });

        set((state) => ({ cards: [...state.cards, newCard] }));
        return newCard;
      },
      removeCard: (cardId) => {
        set((state) => ({ cards: state.cards.filter((card) => card.id !== cardId) }));
      },
      updateCard: (cardId, updates) => {
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId ? normalizeCustomCard({ ...card, ...updates }) : card
          ),
        }));
      },
      getCardsForRoom: (room) => {
        const { cards } = get();
        if (isAllRooms(room)) {
          return cards;
        }
        return cards.filter((card) => card.room === room || card.room === ALL_ROOMS_ID);
      },
    }),
    {
      name: STORE_STORAGE_KEYS.customCards,
      storage: createJSONStorage(() => ({
        getItem: (name) => readLocalStorageWithMigration(name, localStorage),
        setItem: (name, value) => writeLocalStorageWithMigration(name, value, localStorage),
        removeItem: (name) => removeLocalStorageWithMigration(name, localStorage),
      })),
      migrate: (persistedState) => {
        const state = persistedState as CustomCardsState | undefined;
        if (!state) {
          return {
            cards: [],
          };
        }

        return {
          ...state,
          cards: (state.cards as Array<Omit<CustomCard, 'type'> & { type: string }>)
            .filter(
              (card) =>
                card.type !== 'weather' &&
                card.type !== 'calendar' &&
                card.type !== 'presence' &&
                card.type !== 'sparkline'
            )
            .map((card) => ({
              ...card,
              type:
                card.type === 'news' ? 'rss' : card.type === 'sensor-group' ? 'info' : card.type,
            }))
            .map((card) => normalizeCustomCard(card as NormalizableCustomCard)),
        };
      },
    }
  )
);
