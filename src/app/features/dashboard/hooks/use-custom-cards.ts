import { useCustomCardsStore } from '../stores/custom-cards-store';

export type { CustomCard } from '../stores/custom-cards-store';
export { ENERGY_WIDGET_ROOM, HOME_WIDGET_ROOM } from '../stores/custom-cards-store';

export function useCustomCards(room: string = 'All') {
  const cards = useCustomCardsStore((state) => state.getCardsForRoom(room));
  const addCard = useCustomCardsStore((state) => state.addCard);
  const removeCard = useCustomCardsStore((state) => state.removeCard);
  const updateCard = useCustomCardsStore((state) => state.updateCard);
  const getCardsForRoom = useCustomCardsStore((state) => state.getCardsForRoom);

  return {
    customCards: cards,
    addCard,
    removeCard,
    updateCard,
    getCardsForRoom,
  };
}
