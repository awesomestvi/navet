import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { getDeviceTypeLabel } from '@navet/app/constants/device-type-labels';
import { isAllRooms } from '@navet/app/constants/rooms';
import { useI18n } from '@navet/app/hooks';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { lazy, Suspense, useMemo } from 'react';
import type { DashboardController } from '../hooks/use-dashboard-controller';
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
    allEntityIds,
    availableDeviceMap,
    handleAddCard,
    handleAddLibraryCard,
    handleAddEntity,
    handleChooseAllEntities,
    handleChooseBlankDashboard,
    handleOnboardingImportDashboardConfig,
    hiddenEntityIds,
    homeLayout,
    isEditMode,
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

    return [...availableDeviceMap.values()]
      .filter((device) => !placedCardIds.has(device.id))
      .map((device) => ({
        id: device.id,
        title: typeof device.name === 'string' ? device.name : device.id,
        subtitle: getDeviceRoomLabel(device),
        meta:
          ('entityType' in device && typeof device.entityType === 'string' && device.entityType) ||
          getDeviceTypeLabel(device.type, t),
        kind: 'device' as const,
        icon: getDeviceTypeIcon(
          device.type,
          'deviceClass' in device && typeof device.deviceClass === 'string'
            ? device.deviceClass
            : undefined
        ),
      }))
      .sort(
        (left, right) =>
          (left.subtitle ?? '').localeCompare(right.subtitle ?? '') ||
          (left.title ?? '').localeCompare(right.title ?? '')
      );
  }, [
    activeRoom,
    activeSection,
    availableDeviceMap,
    homeLayout.cardIds,
    isEditMode,
    orderedCardIds,
    showAddCardDialog,
    t,
  ]);

  const handleAddNormalCard =
    activeSection === 'home' && isAllRooms(activeRoom) && isEditMode
      ? handleAddLibraryCard
      : handleAddEntity;

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
