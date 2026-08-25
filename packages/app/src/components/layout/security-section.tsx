import { DashboardEmptyState } from '@navet/app/components/patterns';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import { SecurityCameraDashboard } from '@navet/app/features/security/components/security-camera-dashboard';
import { useSecurityAlarmEntities } from '@navet/app/features/security/hooks/use-security-alarm-entities';
import {
  buildSecurityCameraDashboardModel,
  isSecurityDashboardDevice,
} from '@navet/app/features/security/utils/security-camera-dashboard-model';
import {
  getAbsorbedDashboardEntityIds,
  getExpandedHiddenDashboardEntityIds,
  isDashboardEntityHidden,
  useCardState,
  useDeviceCollectionsByKeys,
  useEditMode,
  useI18n,
  useThemeMode,
} from '@navet/app/hooks';
import { Plus, Video } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
    cameras: devices.cameras.filter(
      (device) => !isDashboardEntityHidden(device, filteredEntityIds)
    ),
    covers: devices.covers.filter((device) => !isDashboardEntityHidden(device, filteredEntityIds)),
    locks: devices.locks.filter((device) => !isDashboardEntityHidden(device, filteredEntityIds)),
    sensors: devices.sensors.filter(
      (device) => !isDashboardEntityHidden(device, filteredEntityIds)
    ),
    persons: devices.persons.filter(
      (device) => !isDashboardEntityHidden(device, filteredEntityIds)
    ),
    helpers: devices.helpers.filter(
      (device) => !isDashboardEntityHidden(device, filteredEntityIds)
    ),
  };
}

function getSecuritySectionAbsorbedEntityIds(
  devices: ReturnType<typeof useDeviceCollectionsByKeys>
) {
  const cameraDeviceIds = new Set(
    devices.cameras
      .map((camera) => camera.underlyingDeviceId)
      .filter((deviceId): deviceId is string => typeof deviceId === 'string')
  );
  const cameraDetectionSensorIds = new Set(
    devices.sensors
      .filter(
        (sensor) =>
          (sensor.securityKind === 'motion' || sensor.securityKind === 'occupancy') &&
          typeof sensor.underlyingDeviceId === 'string' &&
          cameraDeviceIds.has(sensor.underlyingDeviceId)
      )
      .map((sensor) => sensor.id)
  );

  return getAbsorbedDashboardEntityIds(devices, []).filter(
    (entityId) => !cameraDetectionSensorIds.has(entityId)
  );
}

interface SecuritySectionProps {
  openAddEntityRequestKey?: number;
  suppressEditActions?: boolean;
  isOverviewCustomizationOpen?: boolean;
  onOverviewCustomizationOpenChange?: (open: boolean) => void;
}

export function SecuritySection({
  openAddEntityRequestKey = 0,
  suppressEditActions = false,
  isOverviewCustomizationOpen = false,
  onOverviewCustomizationOpenChange,
}: SecuritySectionProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const surface = getThemeSurfaceTokens(theme);
  const devices = useDeviceCollectionsByKeys(SECURITY_SECTION_DEVICE_KEYS, {
    deviceFilter: isSecurityDashboardDevice,
  });
  const alarms = useSecurityAlarmEntities();
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
  const absorbedEntityIds = useMemo(() => getSecuritySectionAbsorbedEntityIds(devices), [devices]);
  const absorbedEntityIdSet = useMemo(() => new Set(absorbedEntityIds), [absorbedEntityIds]);
  const availableDevices = useMemo(
    () => filterSecuritySectionDevices(devices, absorbedEntityIdSet),
    [absorbedEntityIdSet, devices]
  );
  const visibleDevices = useMemo(
    () => filterSecuritySectionDevices(availableDevices, hiddenEntityIdSet),
    [availableDevices, hiddenEntityIdSet]
  );
  const model = useMemo(
    () => buildSecurityCameraDashboardModel(visibleDevices, t),
    [t, visibleDevices]
  );
  const allEntitiesModel = useMemo(
    () => buildSecurityCameraDashboardModel(availableDevices, t),
    [availableDevices, t]
  );
  const allSecurityDevices = useMemo(() => allEntitiesModel.allEntities, [allEntitiesModel]);
  const allSecurityDeviceMap = useMemo(
    () => new Map(allSecurityDevices.map((device) => [device.id, device])),
    [allSecurityDevices]
  );
  const hiddenSecurityEntityIds = useMemo(
    () =>
      allSecurityDevices
        .filter((device) => isDashboardEntityHidden(device, hiddenEntityIdSet))
        .map((device) => device.id),
    [allSecurityDevices, hiddenEntityIdSet]
  );
  const visibleAlarms = useMemo(
    () => alarms.filter((alarm) => !hiddenEntityIdSet.has(alarm.id)),
    [alarms, hiddenEntityIdSet]
  );
  const openAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(true), []);
  const closeAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(false), []);
  useEffect(() => {
    if (openAddEntityRequestKey > 0) {
      setIsAddEntityDialogOpen(true);
    }
  }, [openAddEntityRequestKey]);
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

  if (
    model.summary.totalEntities === 0 &&
    hiddenSecurityEntityIds.length === 0 &&
    visibleAlarms.length === 0
  ) {
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
      <div className="flex flex-col gap-6">
        {model.summary.totalEntities > 0 || visibleAlarms.length > 0 ? (
          <SecurityCameraDashboard
            model={model}
            isEditMode={isEditMode}
            onToggleEditMode={suppressEditActions ? undefined : toggleEditMode}
            onAddEntity={suppressEditActions ? undefined : openAddEntityDialog}
            alarms={visibleAlarms}
            cardSizes={cardSizes}
            updateCardSize={updateCardSize}
            onRemoveEntity={handleRemoveEntity}
            surface={surface}
            isOverviewCustomizationOpen={isOverviewCustomizationOpen}
            onOverviewCustomizationOpenChange={onOverviewCustomizationOpenChange}
          />
        ) : null}
        {model.summary.totalEntities === 0 &&
        visibleAlarms.length === 0 &&
        hiddenSecurityEntityIds.length > 0 ? (
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
        ) : null}
      </div>

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
