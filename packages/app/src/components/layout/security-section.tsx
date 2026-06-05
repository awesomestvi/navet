import { DashboardEmptyState } from '@navet/app/components/patterns';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { AddEntityDialog, useDashboardEntitiesStore } from '@navet/app/features/dashboard';
import { SecurityCameraDashboard } from '@navet/app/features/security/components/security-camera-dashboard';
import { buildSecurityCameraDashboardModel } from '@navet/app/features/security/utils/security-camera-dashboard-model';
import { useCardState, useDevices, useEditMode, useI18n, useThemeMode } from '@navet/app/hooks';
import { Plus, Video } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { SectionCustomizeShell } from './section-customize-shell';

export function SecuritySection() {
  const { t } = useI18n();
  const theme = useThemeMode();
  const surface = getThemeSurfaceTokens(theme);
  const devices = useDevices();
  const { isEditMode, toggleEditMode } = useEditMode();
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const { hiddenEntityIds, hideEntity, showEntity } = useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      hideEntity: state.hideEntity,
      showEntity: state.showEntity,
    }))
  );
  const hiddenEntityIdSet = useMemo(() => new Set(hiddenEntityIds), [hiddenEntityIds]);
  const visibleDevices = useMemo(
    () => ({
      ...devices,
      cameras: devices.cameras.filter((device) => !hiddenEntityIdSet.has(device.id)),
      covers: devices.covers.filter((device) => !hiddenEntityIdSet.has(device.id)),
      locks: devices.locks.filter((device) => !hiddenEntityIdSet.has(device.id)),
      sensors: devices.sensors.filter((device) => !hiddenEntityIdSet.has(device.id)),
      persons: devices.persons.filter((device) => !hiddenEntityIdSet.has(device.id)),
      helpers: devices.helpers.filter((device) => !hiddenEntityIdSet.has(device.id)),
    }),
    [devices, hiddenEntityIdSet]
  );
  const model = useMemo(() => buildSecurityCameraDashboardModel(visibleDevices), [visibleDevices]);
  const allEntitiesModel = useMemo(
    () =>
      buildSecurityCameraDashboardModel({
        cameras: devices.cameras,
        covers: devices.covers,
        locks: devices.locks,
        sensors: devices.sensors,
        persons: devices.persons,
        helpers: devices.helpers,
      }),
    [
      devices.cameras,
      devices.covers,
      devices.helpers,
      devices.locks,
      devices.persons,
      devices.sensors,
    ]
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

  if (allEntitiesModel.summary.totalEntities === 0) {
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

  const addHiddenEntityAction =
    isEditMode && hiddenSecurityEntityIds.length > 0 ? (
      <InteractivePill
        intent="action"
        size="small"
        onClick={openAddEntityDialog}
        className={`${surface.subtleBg} ${surface.hoverBg}`}
      >
        <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
        <span className={`hidden text-sm font-medium md:inline ${surface.textSecondary}`}>
          {t('dashboard.addEntity.title')}
        </span>
      </InteractivePill>
    ) : null;

  return (
    <SectionCustomizeShell
      isEditMode={isEditMode}
      onToggle={toggleEditMode}
      className="relative"
      actions={addHiddenEntityAction}
      showCustomizeButton={false}
    >
      {model.summary.totalEntities > 0 ? (
        <SecurityCameraDashboard
          model={model}
          isEditMode={isEditMode}
          onToggleEditMode={toggleEditMode}
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
      ) : null}
    </SectionCustomizeShell>
  );
}
