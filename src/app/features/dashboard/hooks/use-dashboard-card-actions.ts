import { useCallback } from 'react';
import { toast } from 'sonner';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { TranslateFn } from '@/app/hooks';
import type { CardType } from '../components/add-card-dialog';
import type { CustomCard } from '../stores/custom-cards-store';
import { HOME_WIDGET_ROOM } from './use-custom-cards';

interface UseDashboardCardActionsParams {
  activeRoom: string;
  activeSection: string;
  isEditMode: boolean;
  addCard: (type: CardType, size: CardSize, room: string) => CustomCard;
  removeCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
  hideAutoEntity: (entityId: string) => void;
  showAutoEntity: (entityId: string) => void;
  t: TranslateFn;
  addCardTargetSectionId: string | null;
  homeLayoutController: {
    layout: {
      mode: 'flow' | 'sectioned';
      sections: Array<{ id: string }>;
    };
    addCard: (cardId: string, sectionId?: string) => void;
    addSection: () => string;
  };
}

export function useDashboardCardActions({
  activeRoom,
  activeSection,
  isEditMode,
  addCard,
  removeCard,
  updateCard,
  hideAutoEntity,
  showAutoEntity,
  t,
  addCardTargetSectionId,
  homeLayoutController,
}: UseDashboardCardActionsParams) {
  const handleAddCard = useCallback(
    (type: CardType, size: CardSize) => {
      const isHomeCanvasTarget = activeSection === 'home' && activeRoom === 'All' && isEditMode;
      const newCard = addCard(type, size, isHomeCanvasTarget ? HOME_WIDGET_ROOM : activeRoom);
      const targetRoomLabel = isHomeCanvasTarget ? t('dashboard.roomNav.all') : activeRoom;

      if (isHomeCanvasTarget) {
        if (homeLayoutController.layout.mode !== 'sectioned') {
          homeLayoutController.addCard(newCard.id);
        } else {
          const targetSectionId =
            (addCardTargetSectionId &&
              homeLayoutController.layout.sections.some(
                (section) => section.id === addCardTargetSectionId
              ) &&
              addCardTargetSectionId) ||
            homeLayoutController.layout.sections[0]?.id ||
            homeLayoutController.addSection();

          homeLayoutController.addCard(newCard.id, targetSectionId);
        }
      }

      toast.success(t('dashboard.feedback.widgetAdded', { type, room: targetRoomLabel }));
    },
    [
      activeRoom,
      activeSection,
      addCard,
      addCardTargetSectionId,
      homeLayoutController,
      isEditMode,
      t,
    ]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      removeCard(cardId);
      toast.success(t('dashboard.feedback.widgetDeleted'));
    },
    [removeCard, t]
  );

  const handleAddEntity = useCallback(
    (entityId: string) => {
      showAutoEntity(entityId);
      toast.success(t('dashboard.feedback.entityAdded'));
    },
    [showAutoEntity, t]
  );

  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      hideAutoEntity(entityId);
      toast.success(t('dashboard.feedback.entityRemoved'));
    },
    [hideAutoEntity, t]
  );

  const handleUpdateCard = useCallback(
    (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => {
      updateCard(cardId, updates);
    },
    [updateCard]
  );

  return {
    handleAddCard,
    handleDeleteCard,
    handleAddEntity,
    handleRemoveEntity,
    handleUpdateCard,
  };
}
