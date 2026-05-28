import { Plus, Video } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';
import { DashboardEmptyState } from '@/app/components/patterns';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID } from '@/app/constants/rooms';
import { AddEntityDialog, useDashboardEntitiesStore } from '@/app/features/dashboard';
import { SecurityCameraDashboard } from '@/app/features/security/components/security-camera-dashboard';
import { buildSecurityCameraDashboardModel } from '@/app/features/security/utils/security-camera-dashboard-model';
import { useCardState, useDevices, useEditMode, useI18n, useThemeMode } from '@/app/hooks';
import { useProviderRuntime } from '@/app/hooks/use-provider-runtime';
import type { IntegrationStore } from '@/app/stores/integration-store';
import { SectionCustomizeShell } from './section-customize-shell';

export function SecuritySection() {
  const { t } = useI18n();
  const theme = useThemeMode();
  const surface = getThemeSurfaceTokens(theme);
  const devices = useDevices();
  const selectSecuritySummaryEntities = useCallback((state: IntegrationStore) => {
    if (!state.entities) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(state.entities).filter(
        ([entityId]) =>
          entityId.startsWith('binary_sensor.') ||
          entityId.startsWith('alarm_control_panel.') ||
          entityId.startsWith('siren.')
      )
    );
  }, []);
  const entities = useProviderRuntime(selectSecuritySummaryEntities, shallow);
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
      locks: devices.locks.filter((device) => !hiddenEntityIdSet.has(device.id)),
    }),
    [devices, hiddenEntityIdSet]
  );
  const allSecurityDevices = useMemo(
    () => [
      ...devices.cameras.map((device) => ({ ...device, type: 'cameras' as const })),
      ...devices.locks.map((device) => ({ ...device, type: 'locks' as const })),
    ],
    [devices.cameras, devices.locks]
  );
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
  const model = buildSecurityCameraDashboardModel(visibleDevices, entities);

  if (devices.cameras.length === 0 && devices.locks.length === 0) {
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
    >
      {model.summary.totalCameras > 0 || model.locks.length > 0 ? (
        <SecurityCameraDashboard
          model={model}
          isEditMode={isEditMode}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          onRemoveEntity={handleRemoveEntity}
          surface={surface}
          labels={{
            primaryTitle: t('security.dashboard.primaryTitle'),
            stillTitle: t('security.dashboard.stillTitle'),
            stillDescription: t('security.dashboard.stillDescription'),
            noPrimaryTitle: t('security.dashboard.noPrimaryTitle'),
            noPrimaryDescription: t('security.dashboard.noPrimaryDescription'),
            locksTitle: t('sections.locks.title'),
          }}
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
