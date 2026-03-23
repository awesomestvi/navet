import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { ZoneName } from '../zones/zone-types';

export type CardType = 'rss' | 'photo' | 'note' | 'battery' | 'button' | 'presence';
export const HOME_WIDGET_ROOM = '__home__';

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

interface CustomCardsState {
  cards: CustomCard[];
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
      addCard: (type, size, room, data) => {
        const newCard: CustomCard = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          size,
          room,
          data,
          createdAt: Date.now(),
        };

        set((state) => ({ cards: [...state.cards, newCard] }));
        return newCard;
      },
      removeCard: (cardId) => {
        set((state) => ({ cards: state.cards.filter((card) => card.id !== cardId) }));
      },
      updateCard: (cardId, updates) => {
        set((state) => ({
          cards: state.cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)),
        }));
      },
      getCardsForRoom: (room) => {
        const { cards } = get();
        if (room === 'All') {
          return cards;
        }
        return cards.filter((card) => card.room === room || card.room === 'All');
      },
    }),
    {
      name: 'ha-dashboard-custom-cards',
      storage: createJSONStorage(() => localStorage),
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
            .filter((card) => card.type !== 'weather' && card.type !== 'calendar')
            .map((card) => ({
              ...card,
              type: card.type === 'news' ? 'rss' : card.type,
            })) as CustomCard[],
        };
      },
    }
  )
);
