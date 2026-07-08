import { isAllRooms } from '@navet/app/constants/rooms';
import { useI18n } from '@navet/app/hooks';
import { lazy, Suspense, useMemo } from 'react';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { buildManualEntityCardCatalog } from '../utils/manual-entity-card-catalog';
import { AddCardDialogContainer } from './add-card-dialog';
import type { DashboardLibraryCard } from './dashboard-library-list';
import { DashboardOnboardingDialog } from './dashboard-onboarding-dialog';

const ENERGY_DASHBOARD_TEMPLATE_IDS = ['energy-now', 'energy-metric'] as const;

const AddEntityDialog = lazy(async () => {
  const module = await import('./add-entity-dialog');
  return { default: module.AddEntityDialog };
});

interface DashboardOverlaysProps {
  controller: DashboardController;
}

export function DashboardOverlays({ controller }: DashboardOverlaysProps) {
  const { t } = useI18n();
  const {
    activeRoom,
    activeSection,
    addableEntityIds,
    allCustomCards,
    allEntityIds,
    availableDeviceMap,
    customCards,
    handleAddCard,
    handleAddGenericEntityCard,
    handleAddLibraryCard,
    handleAddEntity,
    handleChooseAllEntities,
    handleChooseBlankDashboard,
    handleOnboardingImportDashboardConfig,
    hiddenEntityIds,
    homeLayout,
    isEditMode,
    manualDeviceMap,
    manualEntityViewsByCanonicalId,
    isOnboardingClosing,
    onboardingCompleted,
    onCompleteOnboardingClose,
    onCloseAddCardDialog,
    onCloseAddEntityDialog,
    orderedCardIds,
    showAddCardDialog,
    showAddEntityDialog,
  } = controller;

  const normalCards = useMemo<DashboardLibraryCard[]>(() => {
    if (!showAddCardDialog) {
      return [];
    }

    const isHomeCanvasTarget = activeSection === 'home' && isAllRooms(activeRoom) && isEditMode;
    const placedCardIds = new Set(isHomeCanvasTarget ? homeLayout.cardIds : orderedCardIds);
    const catalogCustomCards = isHomeCanvasTarget ? allCustomCards : customCards;

    return buildManualEntityCardCatalog({
      customCards: catalogCustomCards,
      deviceMap: manualDeviceMap,
      entityViewsByCanonicalId: manualEntityViewsByCanonicalId,
      placedCardIds,
      t,
    });
  }, [
    activeRoom,
    activeSection,
    allCustomCards,
    availableDeviceMap,
    customCards,
    homeLayout.cardIds,
    isEditMode,
    manualDeviceMap,
    manualEntityViewsByCanonicalId,
    orderedCardIds,
    showAddCardDialog,
    t,
  ]);

  const handleAddNormalCard = (cardId: string) => {
    const isHomeCanvasTarget = activeSection === 'home' && isAllRooms(activeRoom) && isEditMode;
    if (availableDeviceMap.has(cardId)) {
      if (isHomeCanvasTarget) {
        handleAddLibraryCard(cardId);
        return;
      }

      handleAddEntity(cardId);
      return;
    }

    handleAddGenericEntityCard(cardId);
  };

  return (
    <>
      {showAddCardDialog && (
        <AddCardDialogContainer
          open={showAddCardDialog}
          onClose={onCloseAddCardDialog}
          onAddCard={handleAddCard}
          onAddLibraryCard={handleAddNormalCard}
          currentRoom={activeSection === 'energy' ? t('sidebar.energy') : activeRoom}
          libraryCards={normalCards}
          showCardsTab={activeSection !== 'energy'}
          allowedTemplateIds={
            activeSection === 'energy' ? [...ENERGY_DASHBOARD_TEMPLATE_IDS] : undefined
          }
        />
      )}

      {showAddEntityDialog && (
        <Suspense fallback={null}>
          <AddEntityDialog
            open={showAddEntityDialog}
            onClose={onCloseAddEntityDialog}
            onAddEntity={handleAddEntity}
            currentRoom={activeRoom}
            deviceMap={availableDeviceMap}
            addedEntityIds={[]}
            visibleEntityIds={addableEntityIds}
            title={t('dashboard.addEntity.title')}
            description={
              hiddenEntityIds.length > 0
                ? t('dashboard.addEntity.descriptionWithHidden')
                : t('dashboard.addEntity.descriptionDefault')
            }
            actionLabel={t('dashboard.addEntity.action')}
          />
        </Suspense>
      )}

      {(!onboardingCompleted || isOnboardingClosing) && allEntityIds.length > 0 && (
        <DashboardOnboardingDialog
          open
          onChooseAll={handleChooseAllEntities}
          onChooseBlank={handleChooseBlankDashboard}
          onImportConfig={handleOnboardingImportDashboardConfig}
          phase={isOnboardingClosing ? 'closing' : 'idle'}
          onClosingAnimationComplete={onCompleteOnboardingClose}
        />
      )}
    </>
  );
}
