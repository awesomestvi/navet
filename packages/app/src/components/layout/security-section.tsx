import { DashboardEmptyState } from '@navet/app/components/patterns';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { SecurityCameraDashboard } from '@navet/app/features/security/components/security-camera-dashboard';
import { buildSecurityCameraDashboardModel } from '@navet/app/features/security/utils/security-camera-dashboard-model';
import {
  getAbsorbedDashboardEntityIds,
  getExpandedHiddenDashboardEntityIds,
  useCardState,
  useDeviceCollectionsByKeys,
  useEditMode,
  useI18n,
  useThemeMode,
} from '@navet/app/hooks';
import { Plus, Video } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { SectionCustomizeShell } from './section-customize-shell';

const AddEntityDialog = lazy(async () => {
  const module = await import('@navet/app/features/dashboard/components/add-entity-dialog');
  return { default: module.AddEntityDialog };
});

const SECURITY_SECTION_DEVICE_KEYS = [
  'cameras',
  'covers',
  'locks',
  'sensors',
  'persons',
  'helpers',
] as const;

function filterSecuritySectionDevices(
  devices: ReturnType<typeof useDeviceCollectionsByKeys>,
  filteredEntityIds: Set<string>
) {
  return {
    ...devices,
    cameras: devices.cameras.filter((device) => !filteredEntityIds.has(device.id)),
    covers: devices.covers.filter((device) => !filteredEntityIds.has(device.id)),
    locks: devices.locks.filter((device) => !filteredEntityIds.has(device.id)),
    sensors: devices.sensors.filter((device) => !filteredEntityIds.has(device.id)),
    persons: devices.persons.filter((device) => !filteredEntityIds.has(device.id)),
    helpers: devices.helpers.filter((device) => !filteredEntityIds.has(device.id)),
  };
}

export function SecuritySection() {
  const { t } = useI18n();
  const theme = useThemeMode();
  const surface = getThemeSurfaceTokens(theme);
  const devices = useDeviceCollectionsByKeys(SECURITY_SECTION_DEVICE_KEYS);
  const { isEditMode, toggleEditMode } = useEditMode();
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const { hiddenEntityIds, hideEntity, showEntity } = useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      hideEntity: state.hideEntity,
      showEntity: state.showEntity,
    }))
  );
  const hiddenEntityIdSet = useMemo(
    () => new Set(getExpandedHiddenDashboardEntityIds(devices, hiddenEntityIds)),
    [devices, hiddenEntityIds]
  );
  const absorbedEntityIds = useMemo(() => getAbsorbedDashboardEntityIds(devices, []), [devices]);
  const absorbedEntityIdSet = useMemo(() => new Set(absorbedEntityIds), [absorbedEntityIds]);
  const availableDevices = useMemo(
    () => filterSecuritySectionDevices(devices, absorbedEntityIdSet),
    [absorbedEntityIdSet, devices]
  );
  const visibleDevices = useMemo(
    () => filterSecuritySectionDevices(availableDevices, hiddenEntityIdSet),
    [availableDevices, hiddenEntityIdSet]
  );
  const model = useMemo(() => buildSecurityCameraDashboardModel(visibleDevices), [visibleDevices]);
  const allEntitiesModel = useMemo(
    () => buildSecurityCameraDashboardModel(availableDevices),
    [availableDevices]
  );
  const allSecurityDevices = useMemo(() => allEntitiesModel.allEntities, [allEntitiesModel]);
  const allSecurityDeviceMap = useMemo(
    () => new Map(allSecurityDevices.map((device) => [device.id, device])),
    [allSecurityDevices]
  );
  const hiddenSecurityEntityIds = useMemo(
    () =>
      allSecurityDevices
        .filter((device) => hiddenEntityIdSet.has(device.id))
        .map((device) => device.id),
    [allSecurityDevices, hiddenEntityIdSet]
  );
  const openAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(true), []);
  const closeAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(false), []);
  const handleAddEntity = useCallback(
    (entityId: string) => {
      showEntity(entityId);
      toast.success(t('dashboard.feedback.entityAdded'));
    },
    [showEntity, t]
  );
  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      hideEntity(entityId);
      toast.success(t('dashboard.feedback.entityRemoved'), {
        id: 'dashboard-entity-removed',
      });
    },
    [hideEntity, t]
  );
  const { cardSizes, updateCardSize } = useCardState(devices);

  if (model.summary.totalEntities === 0 && hiddenSecurityEntityIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Video}
          title={t('sections.security.emptyTitle')}
          description={t('sections.security.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  return (
    <SectionCustomizeShell
      isEditMode={isEditMode}
      onToggle={toggleEditMode}
      className="relative"
      actions={null}
      showCustomizeButton={false}
    >
      {model.summary.totalEntities > 0 ? (
        <SecurityCameraDashboard
          model={model}
          isEditMode={isEditMode}
          onToggleEditMode={toggleEditMode}
          onAddEntity={openAddEntityDialog}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          onRemoveEntity={handleRemoveEntity}
          surface={surface}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6 pt-14">
          <DashboardEmptyState
            icon={Video}
            title={t('sections.security.emptyTitle')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionIcon={Plus}
            actionLabel={t('dashboard.addEntity.title')}
            onAction={openAddEntityDialog}
            className="w-full max-w-md"
          />
        </div>
      )}

      {isAddEntityDialogOpen ? (
        <Suspense fallback={null}>
          <AddEntityDialog
            open={isAddEntityDialogOpen}
            onClose={closeAddEntityDialog}
            onAddEntity={handleAddEntity}
            currentRoom={ALL_ROOMS_ID}
            deviceMap={allSecurityDeviceMap}
            addedEntityIds={[]}
            visibleEntityIds={hiddenSecurityEntityIds}
            title={t('dashboard.addEntity.title')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionLabel={t('dashboard.addEntity.action')}
          />
        </Suspense>
      ) : null}
    </SectionCustomizeShell>
  );
}
