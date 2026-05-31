import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { ENERGY_WIDGET_ROOM, HOME_WIDGET_ROOM, isAllRooms } from '@navet/app/constants/rooms';
import type { TranslateFn } from '@navet/app/hooks';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { CardTemplate, CardType } from '../components/add-card-dialog';
import type { CustomCard } from '../stores/custom-cards-store';

interface UseDashboardCardActionsParams {
  activeRoom: string;
  activeSection: string;
  isEditMode: boolean;
  addCard: (
    type: CardType,
    size: CardSize,
    room: string,
    data?: Record<string, unknown>
  ) => CustomCard;
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
    removeCard: (cardId: string) => void;
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
    (template: CardTemplate, size: CardSize) => {
      const isHomeCanvasTarget = activeSection === 'home' && isAllRooms(activeRoom) && isEditMode;
      const isEnergyDashboardTarget = activeSection === 'energy';
      const targetRoom = isHomeCanvasTarget
        ? HOME_WIDGET_ROOM
        : isEnergyDashboardTarget
          ? ENERGY_WIDGET_ROOM
          : activeRoom;
      const newCard = addCard(template.cardType, size, targetRoom, template.initialData);
      const targetRoomLabel = isHomeCanvasTarget
        ? t('dashboard.roomNav.all')
        : isEnergyDashboardTarget
          ? t('sidebar.energy')
          : activeRoom;

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

      toast.success(
        t('dashboard.feedback.widgetAdded', {
          type: t(template.nameKey),
          room: targetRoomLabel,
        })
      );
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
      homeLayoutController.removeCard(cardId);
      toast.success(t('dashboard.feedback.widgetDeleted'));
    },
    [homeLayoutController, removeCard, t]
  );

  const handleAddLibraryCard = useCallback(
    (cardId: string) => {
      const isHomeCanvasTarget = activeSection === 'home' && isAllRooms(activeRoom) && isEditMode;
      if (!isHomeCanvasTarget) {
        return;
      }

      if (homeLayoutController.layout.mode !== 'sectioned') {
        homeLayoutController.addCard(cardId);
      } else {
        const targetSectionId =
          (addCardTargetSectionId &&
            homeLayoutController.layout.sections.some(
              (section) => section.id === addCardTargetSectionId
            ) &&
            addCardTargetSectionId) ||
          homeLayoutController.layout.sections[0]?.id ||
          homeLayoutController.addSection();

        homeLayoutController.addCard(cardId, targetSectionId);
      }

      toast.success(t('dashboard.feedback.cardAddedToHome'));
    },
    [activeRoom, activeSection, addCardTargetSectionId, homeLayoutController, isEditMode, t]
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
      toast.success(t('dashboard.feedback.entityRemoved'), {
        id: 'dashboard-entity-removed',
      });
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
    handleAddLibraryCard,
    handleDeleteCard,
    handleAddEntity,
    handleRemoveEntity,
    handleUpdateCard,
  };
}
