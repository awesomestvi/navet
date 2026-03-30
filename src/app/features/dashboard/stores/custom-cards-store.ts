import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { ZoneName } from '../zones/zone-types';

export type CardType = 'rss' | 'photo' | 'note' | 'battery' | 'button' | 'presence' | 'sparkline';
export const HOME_WIDGET_ROOM = '__home__';
export const ENERGY_WIDGET_ROOM = '__energy__';

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

function normalizeCustomCard(card: CustomCard): CustomCard {
  if (card.type === 'sparkline' && card.size !== 'small' && card.size !== 'medium') {
    return { ...card, size: 'medium' };
  }

  return card;
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
            }))
            .map((card) => normalizeCustomCard(card as CustomCard)),
        };
      },
    }
  )
);
