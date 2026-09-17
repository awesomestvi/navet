import { SectionCustomizeShell } from '@navet/app/components/layout/section-customize-shell';
import { DashboardEmptyState } from '@navet/app/components/patterns';
import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@navet/app/components/shared/render-profiler';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { buildLightSceneShortcuts } from '@navet/app/features/lighting/dashboard/light-dashboard-model';
import { useI18n } from '@navet/app/hooks';
import { Lightbulb } from 'lucide-react';
import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react';
import type { DashboardSectionModel } from '../hooks/use-dashboard-controller.types';

const LightsDashboard = lazy(async () => {
  const module = await import('@navet/app/features/lighting/dashboard/lights-dashboard');
  return { default: module.LightsDashboard };
});
const AddEntityDialog = lazy(async () => {
  const module = await import('./add-entity-dialog');
  return { default: module.AddEntityDialog };
});

type DashboardLightsSectionProps = Pick<
  DashboardSectionModel,
  | 'cardOrders'
  | 'handleAddEntity'
  | 'handleRemoveEntity'
  | 'isEditMode'
  | 'lightDeviceMap'
  | 'lightRooms'
  | 'onToggleEditMode'
> & {
  allLightDeviceMap: DashboardSectionModel['sectionData']['allLightDeviceMap'];
  hiddenLightEntityIds: string[];
};

function DashboardLightsSectionComponent({
  allLightDeviceMap,
  cardOrders,
  handleAddEntity,
  handleRemoveEntity,
  hiddenLightEntityIds,
  isEditMode,
  lightDeviceMap,
  lightRooms,
  onToggleEditMode,
}: DashboardLightsSectionProps) {
  const { locale, t } = useI18n();
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const lightScenes = useMemo(
    () => buildLightSceneShortcuts(lightDeviceMap.values(), locale),
    [lightDeviceMap, locale]
  );
  const openAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(true), []);
  const closeAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(false), []);

  return (
    <div className="relative flex flex-col gap-2 md:gap-6">
      {lightDeviceMap.size > 0 ? (
        <SectionCustomizeShell
          isEditMode={isEditMode}
          onToggle={onToggleEditMode}
          className="relative"
          actions={null}
          showCustomizeButton={false}
        >
          <RenderProfiler id="LightsSection">
            <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
              <LightsDashboard
                deviceMap={lightDeviceMap}
                rooms={lightRooms}
                cardOrders={cardOrders}
                scenes={lightScenes}
                isEditMode={isEditMode}
                onRemoveEntity={handleRemoveEntity}
              />
            </Suspense>
          </RenderProfiler>
        </SectionCustomizeShell>
      ) : (
        <div className="flex h-full items-center justify-center p-6">
          <DashboardEmptyState
            icon={Lightbulb}
            title={t('dashboard.shell.noLightsTitle')}
            description={
              hiddenLightEntityIds.length > 0
                ? t('dashboard.shell.noLightsHidden')
                : t('dashboard.shell.noLightsEmpty')
            }
            actionIcon={Lightbulb}
            actionLabel={
              hiddenLightEntityIds.length > 0 ? t('dashboard.addEntity.title') : undefined
            }
            onAction={hiddenLightEntityIds.length > 0 ? openAddEntityDialog : undefined}
            className="w-full max-w-md"
          />
        </div>
      )}

      {isAddEntityDialogOpen ? (
        <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
          <AddEntityDialog
            open
            onClose={closeAddEntityDialog}
            onAddEntity={handleAddEntity}
            currentRoom={ALL_ROOMS_ID}
            deviceMap={allLightDeviceMap}
            addedEntityIds={[]}
            visibleEntityIds={hiddenLightEntityIds}
            title={t('dashboard.addEntity.title')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionLabel={t('dashboard.addEntity.action')}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

export const DashboardLightsSection = memo(DashboardLightsSectionComponent);
