import { useMemo } from 'react';
import { getDeviceTypeIcon } from '@/app/constants/device-type-icons';
import { getDeviceTypeLabel } from '@/app/constants/device-type-labels';
import { useI18n } from '@/app/hooks';
import { getDeviceRoomLabel } from '@/app/utils/device-location';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { AddCardDialogContainer } from './add-card-dialog';
import { AddEntityDialog } from './add-entity-dialog';
import type { DashboardLibraryCard } from './dashboard-library-list';
import { DashboardOnboardingDialog } from './dashboard-onboarding-dialog';

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
    const visibleCardIds = new Set(orderedCardIds);

    return [...availableDeviceMap.values()]
      .filter((device) => !visibleCardIds.has(device.id))
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
          left.subtitle.localeCompare(right.subtitle) || left.title.localeCompare(right.title)
      );
  }, [availableDeviceMap, orderedCardIds, t]);

  const handleAddNormalCard =
    activeSection === 'home' && activeRoom === 'All' && isEditMode
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
          currentRoom={activeRoom}
          libraryCards={normalCards}
        />
      )}

      {showAddEntityDialog && (
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
