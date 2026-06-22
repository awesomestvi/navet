import { getManageableRoomOrder } from '@navet/app/components/layout/mobile-layout-helpers';
import { RoomNav } from '@navet/app/components/layout/room-nav';
import { SectionCustomizeShell } from '@navet/app/components/layout/section-customize-shell';
import { DashboardEmptyState } from '@navet/app/components/patterns';
import { InteractivePill } from '@navet/app/components/primitives';
import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@navet/app/components/shared/render-profiler';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID, isAllRooms } from '@navet/app/constants/rooms';
import { getClimateDashboardGroup } from '@navet/app/features/climate/utils/climate-dashboard-group';
import { buildRoomStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import { SummaryBar } from '@navet/app/features/sensors/components/info-badge-strip';
import { useTaskRoutines } from '@navet/app/features/tasks/hooks/use-task-automation-groups';
import { useI18n, useIntegrationStore, useMediaQuery, useTheme } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { integrationSelectors, settingsSelectors } from '@navet/app/stores/selectors';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { Lightbulb, Plus, Thermometer } from 'lucide-react';
import { lazy, memo, type ReactNode, Suspense, useCallback, useMemo, useState } from 'react';
import { DeviceGrid } from '../device-grid';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { DashboardLayout } from '../shell';

const SecuritySection = lazy(async () => {
  const module = await import('@navet/app/components/layout/security-section');
  return { default: module.SecuritySection };
});
const HomeDashboardOverview = lazy(async () => {
  const module = await import('./home-dashboard-overview');
  return { default: module.HomeDashboardOverview };
});
const TasksSection = lazy(async () => {
  const module = await import('@navet/app/features/tasks/components/tasks-section');
  return { default: module.TasksSection };
});
const MediaSection = lazy(async () => {
  const module = await import('@navet/app/components/layout/media-section');
  return { default: module.MediaSection };
});
const EnergySection = lazy(async () => {
  const module = await import('@navet/app/features/energy/components/energy-section');
  return { default: module.EnergySection };
});
const SettingsSection = lazy(async () => {
  const module = await import('@navet/app/features/settings/components/settings-section');
  return { default: module.SettingsSection };
});
const AllViewGrid = lazy(async () => {
  const module = await import('../all-view-grid');
  return { default: module.AllViewGrid };
});
const AddEntityDialog = lazy(async () => {
  const module = await import('./add-entity-dialog');
  return { default: module.AddEntityDialog };
});

interface DashboardSectionRouterProps {
  controller: DashboardController;
}

function isActiveRoutine(routine: { enabled?: boolean; state: string }) {
  return (
    routine.enabled === true ||
    ['active', 'on', 'scening'].includes(routine.state.trim().toLowerCase())
  );
}

export function shouldSubscribeTaskRoutines(activeSection: DashboardController['activeSection']) {
  return activeSection === 'home' || activeSection === 'tasks';
}

function DashboardSectionRouterComponent({ controller }: DashboardSectionRouterProps) {
  const { t } = useI18n();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const manageableRoomsByProviderId = useIntegrationStore(
    integrationSelectors.manageableRoomsByProviderId
  );
  const kioskMode = useSettingsStore(settingsSelectors.kioskMode);
  const showSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const routines = useTaskRoutines({
    enabled: shouldSubscribeTaskRoutines(controller.activeSection),
  });
  const [isAddLightEntityDialogOpen, setIsAddLightEntityDialogOpen] = useState(false);
  const [isAddClimateEntityDialogOpen, setIsAddClimateEntityDialogOpen] = useState(false);
  const [securityAddEntityRequestKey, setSecurityAddEntityRequestKey] = useState(0);
  const {
    activeRoom,
    activeSection,
    addableEntityIds,
    availableDeviceMap,
    cardOrders,
    cardSizes,
    changeRoom,
    customCards,
    deviceMap,
    handleAddEntity,
    handleDeleteCard,
    handleRemoveEntity,
    handleUpdateCard,
    hiddenEntityIds,
    isEditMode,
    lightDeviceMap,
    lightRooms,
    onOpenAddEntityDialog,
    onToggleEditMode,
    orderedCardIds,
    rooms,
    sectionData,
    updateCardSize,
  } = controller;
  const manageableRoomReferences = useMemo(
    () => Object.values(manageableRoomsByProviderId).flat(),
    [manageableRoomsByProviderId]
  );
  const manageableRooms = getManageableRoomOrder(rooms, manageableRoomReferences);
  const sectionStackProps = {
    className: 'flex flex-col gap-2 md:gap-6',
  };
  const totalRoutineCount =
    routines.automations.filter(isActiveRoutine).length +
    routines.quickActions.filter(isActiveRoutine).length;
  const roomClimateEntityIds = useMemo(() => {
    if (isAllRooms(activeRoom)) {
      return undefined;
    }

    return new Set(
      Array.from(deviceMap.values())
        .filter(
          (device) =>
            getDeviceRoomLabel(device) === activeRoom && getClimateDashboardGroup(device) !== null
        )
        .map((device) => device.id)
    );
  }, [activeRoom, deviceMap]);
  const roomStatusSummaryItems = useMemo(() => {
    if (!sectionData.isOverviewSection || isAllRooms(activeRoom) || !showSummaryBar) {
      return [];
    }

    const routineCount =
      routines.automations.filter(
        (routine) => routine.room === activeRoom && isActiveRoutine(routine)
      ).length +
      routines.quickActions.filter(
        (routine) => routine.room === activeRoom && isActiveRoutine(routine)
      ).length;

    return buildRoomStatusSummaryItems(availableDeviceMap, activeRoom, {
      climateEntityIds: roomClimateEntityIds,
      routineCount,
      temperatureUnit,
    });
  }, [
    activeRoom,
    availableDeviceMap,
    roomClimateEntityIds,
    routines.automations,
    routines.quickActions,
    showSummaryBar,
    temperatureUnit,
    sectionData.isOverviewSection,
  ]);
  const openAddLightEntityDialog = useCallback(() => setIsAddLightEntityDialogOpen(true), []);
  const closeAddLightEntityDialog = useCallback(() => setIsAddLightEntityDialogOpen(false), []);
  const openAddClimateEntityDialog = useCallback(() => setIsAddClimateEntityDialogOpen(true), []);
  const closeAddClimateEntityDialog = useCallback(() => setIsAddClimateEntityDialogOpen(false), []);
  const handleAddLightEntity = useCallback(
    (entityId: string) => {
      handleAddEntity(entityId);
    },
    [handleAddEntity]
  );
  const handleAddClimateEntity = useCallback(
    (entityId: string) => {
      handleAddEntity(entityId);
    },
    [handleAddEntity]
  );
  const openSecurityAddEntityDialog = useCallback(
    () => setSecurityAddEntityRequestKey((previous) => previous + 1),
    []
  );
  const canOpenAddEntityDialog = addableEntityIds.length > 0;
  const headerAddAction =
    isEditMode && activeSection === 'energy'
      ? controller.onOpenAddCardDialog
      : isEditMode && activeSection === 'home'
        ? controller.onOpenAddCardDialog
        : isEditMode && activeSection === 'security'
          ? openSecurityAddEntityDialog
          : canOpenAddEntityDialog
            ? onOpenAddEntityDialog
            : undefined;
  const headerAddLabel =
    isEditMode && (activeSection === 'home' || activeSection === 'energy')
      ? t('dashboard.roomNav.addCard')
      : t('dashboard.addEntity.title');

  let sectionContent: ReactNode;

  if (activeSection === 'security') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <SecuritySection openAddEntityRequestKey={securityAddEntityRequestKey} />
      </Suspense>
    );
  } else if (activeSection === 'energy') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <RenderProfiler id="EnergySection">
          <div className="space-y-6">
            <EnergySection
              energyCustomCards={sectionData.energyCustomCards}
              energyOrderedCardIds={sectionData.energyOrderedCardIds}
              isEditMode={isEditMode}
              onOpenAddCardDialog={controller.onOpenAddCardDialog}
              onToggleEditMode={onToggleEditMode}
              onDeleteCard={handleDeleteCard}
              onUpdateCard={handleUpdateCard}
            />
          </div>
        </RenderProfiler>
      </Suspense>
    );
  } else if (activeSection === 'tasks') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <TasksSection />
      </Suspense>
    );
  } else if (activeSection === 'climate') {
    const addHiddenClimateEntityAction =
      isEditMode && sectionData.hiddenClimateEntityIds.length > 0 ? (
        <InteractivePill
          intent="action"
          size="small"
          onClick={openAddClimateEntityDialog}
          className={`${surface.subtleBg} ${surface.hoverBg}`}
        >
          <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
          <span className={`hidden text-sm font-medium md:inline ${surface.textSecondary}`}>
            {t('dashboard.addEntity.title')}
          </span>
        </InteractivePill>
      ) : null;

    sectionContent = (
      <div {...sectionStackProps} className="relative flex flex-col gap-2 md:gap-6">
        {sectionData.climateDeviceMap.size > 0 ? (
          <SectionCustomizeShell
            isEditMode={isEditMode}
            onToggle={onToggleEditMode ?? (() => {})}
            className="relative"
            actions={isMobileViewport ? null : addHiddenClimateEntityAction}
            showCustomizeButton={!isMobileViewport}
          >
            <RenderProfiler id="ClimateSection">
              <div className="space-y-8">
                {sectionData.climateSections.map((section) => (
                  <section key={section.key} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
                        {t(section.titleKey)}
                      </h2>
                      <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
                        {section.orderedIds.length}{' '}
                        {section.orderedIds.length === 1
                          ? t('sections.climate.singular')
                          : t('sections.climate.plural')}
                      </span>
                    </div>
                    <DeviceGrid
                      orderedCardIds={section.orderedIds}
                      deviceMap={sectionData.climateDeviceMap}
                      isEditMode={isEditMode}
                      cardSizes={cardSizes}
                      updateCardSize={updateCardSize}
                      onRemoveEntity={handleRemoveEntity}
                      allowEntityRemoval
                      usesHideAction
                      densePerformanceMode={controller.densePerformanceMode}
                      getDeviceHeaderSubtitle={getDeviceRoomLabel}
                    />
                  </section>
                ))}
              </div>
            </RenderProfiler>
          </SectionCustomizeShell>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <DashboardEmptyState
              icon={Thermometer}
              title={t('sections.climate.emptyTitle')}
              description={
                sectionData.hiddenClimateEntityIds.length > 0
                  ? t('sections.climate.emptyHiddenDescription')
                  : t('sections.climate.emptyDescription')
              }
              actionIcon={Thermometer}
              actionLabel={
                sectionData.hiddenClimateEntityIds.length > 0
                  ? t('dashboard.addEntity.title')
                  : undefined
              }
              onAction={
                sectionData.hiddenClimateEntityIds.length > 0
                  ? openAddClimateEntityDialog
                  : undefined
              }
              className="w-full max-w-md"
            />
          </div>
        )}

        {isAddClimateEntityDialogOpen ? (
          <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
            <AddEntityDialog
              open={isAddClimateEntityDialogOpen}
              onClose={closeAddClimateEntityDialog}
              onAddEntity={handleAddClimateEntity}
              currentRoom={ALL_ROOMS_ID}
              deviceMap={sectionData.allClimateDeviceMap}
              addedEntityIds={[]}
              visibleEntityIds={sectionData.hiddenClimateEntityIds}
              title={t('dashboard.addEntity.title')}
              description={t('dashboard.addEntity.descriptionWithHidden')}
              actionLabel={t('dashboard.addEntity.action')}
            />
          </Suspense>
        ) : null}
      </div>
    );
  } else if (activeSection === 'lights') {
    const addHiddenLightEntityAction =
      isEditMode && sectionData.hiddenLightEntityIds.length > 0 ? (
        <InteractivePill
          intent="action"
          size="small"
          onClick={openAddLightEntityDialog}
          className={`${surface.subtleBg} ${surface.hoverBg}`}
        >
          <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
          <span className={`hidden text-sm font-medium md:inline ${surface.textSecondary}`}>
            {t('dashboard.addEntity.title')}
          </span>
        </InteractivePill>
      ) : null;

    sectionContent = (
      <div {...sectionStackProps} className="relative flex flex-col gap-2 md:gap-6">
        {lightDeviceMap.size > 0 ? (
          <SectionCustomizeShell
            isEditMode={isEditMode}
            onToggle={onToggleEditMode ?? (() => {})}
            className="relative"
            actions={isMobileViewport ? null : addHiddenLightEntityAction}
            showCustomizeButton={!isMobileViewport}
          >
            <RenderProfiler id="LightsSection">
              <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
                <AllViewGrid
                  deviceMap={lightDeviceMap}
                  rooms={lightRooms}
                  cardOrders={cardOrders}
                  isEditMode={isEditMode}
                  cardSizes={cardSizes}
                  grouping="custom"
                  updateCardSize={updateCardSize}
                  onRemoveEntity={handleRemoveEntity}
                  allowEntityRemoval
                  usesHideAction
                  densePerformanceMode={controller.densePerformanceMode}
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
                sectionData.hiddenLightEntityIds.length > 0
                  ? t('dashboard.shell.noLightsHidden')
                  : t('dashboard.shell.noLightsEmpty')
              }
              actionIcon={Lightbulb}
              actionLabel={
                sectionData.hiddenLightEntityIds.length > 0
                  ? t('dashboard.addEntity.title')
                  : undefined
              }
              onAction={
                sectionData.hiddenLightEntityIds.length > 0 ? openAddLightEntityDialog : undefined
              }
              className="w-full max-w-md"
            />
          </div>
        )}

        {isAddLightEntityDialogOpen ? (
          <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
            <AddEntityDialog
              open={isAddLightEntityDialogOpen}
              onClose={closeAddLightEntityDialog}
              onAddEntity={handleAddLightEntity}
              currentRoom={ALL_ROOMS_ID}
              deviceMap={sectionData.allLightDeviceMap}
              addedEntityIds={[]}
              visibleEntityIds={sectionData.hiddenLightEntityIds}
              title={t('dashboard.addEntity.title')}
              description={t('dashboard.addEntity.descriptionWithHidden')}
              actionLabel={t('dashboard.addEntity.action')}
            />
          </Suspense>
        ) : null}
      </div>
    );
  } else if (activeSection === 'media') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <MediaSection />
      </Suspense>
    );
  } else if (activeSection === 'settings') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner message={t('dashboard.shell.loadingSettings')} />}>
        <RenderProfiler id="SettingsSection">
          <SettingsSection />
        </RenderProfiler>
      </Suspense>
    );
  } else {
    sectionContent = (
      <div {...sectionStackProps}>
        {kioskMode ? null : (
          <RoomNav
            rooms={rooms}
            hiddenRoomNames={controller.hiddenRoomNames}
            roomHiddenItemCounts={controller.roomHiddenItemCounts}
            roomItemCounts={controller.roomItemCounts}
            activeRoom={activeRoom}
            onRoomChange={changeRoom}
            isEditMode={isEditMode}
            onRoomOrderChange={controller.onSetRoomOrder}
            onHiddenRoomsChange={controller.onSetHiddenRoomNames}
            onToggleEditMode={onToggleEditMode}
            onAddEntity={headerAddAction}
            addEntityLabel={headerAddLabel}
          />
        )}

        {isAllRooms(activeRoom) ? (
          <RenderProfiler id="HomeDashboardOverview">
            <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
              <HomeDashboardOverview
                deviceMap={controller.availableDeviceMap}
                summaryDeviceMap={controller.availableDeviceMap}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                isEditMode={isEditMode}
                hiddenEntityCount={hiddenEntityIds.length}
                allCustomCards={controller.allCustomCards}
                homeLayout={controller.homeLayout}
                removeHomeCard={controller.removeHomeCard}
                moveHomeCard={controller.moveHomeCard}
                setHomeLayoutMode={controller.setHomeLayoutMode}
                addHomeSection={controller.addHomeSection}
                addHomeColumnSection={controller.addHomeColumnSection}
                addHomeSectionBelow={controller.addHomeSectionBelow}
                moveHomeSection={controller.moveHomeSection}
                moveHomeColumn={controller.moveHomeColumn}
                renameHomeSection={controller.renameHomeSection}
                removeHomeSection={controller.removeHomeSection}
                resizeHomeSection={controller.resizeHomeSection}
                onOpenAddCardDialog={controller.onOpenAddCardDialog}
                onUpdateCard={handleUpdateCard}
                onToggleEditMode={controller.onToggleEditMode}
                onNavigateSection={controller.setActiveSection}
                routineCount={totalRoutineCount}
                securityAlertCount={controller.securityAlertCount}
                densePerformanceMode={controller.densePerformanceMode}
              />
            </Suspense>
          </RenderProfiler>
        ) : (
          <RenderProfiler id={`DeviceGrid:${activeRoom}`}>
            <div className="space-y-2 md:space-y-6">
              <SummaryBar
                items={roomStatusSummaryItems}
                onNavigate={controller.setActiveSection}
                ariaLabel={t('settings.dashboard.homeSummaryBar.title')}
              />
              {/* Note: Will be added later */}
              {/* <RoomOverviewPanel
                room={activeRoom}
                orderedCardIds={orderedCardIds}
                deviceMap={deviceMap}
              /> */}
              <DeviceGrid
                orderedCardIds={orderedCardIds}
                deviceMap={deviceMap}
                isEditMode={isEditMode}
                cardSizes={cardSizes}
                updateCardSize={updateCardSize}
                customCards={customCards}
                onDeleteCard={handleDeleteCard}
                onUpdateCard={handleUpdateCard}
                onRemoveEntity={handleRemoveEntity}
                allowEntityRemoval
                usesHideAction
                densePerformanceMode={controller.densePerformanceMode}
              />
            </div>
          </RenderProfiler>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout
      densePerformanceMode={controller.densePerformanceMode}
      mobileEditActions={{
        isEditMode,
        onToggleEditMode,
        onAddEntity: headerAddAction,
        addEntityLabel: headerAddLabel,
        ...(activeSection === 'home' && manageableRooms.length > 0
          ? {
              reorderRooms: {
                rooms: manageableRooms,
                hiddenRoomNames: controller.hiddenRoomNames,
                manageableRooms: manageableRoomReferences,
                roomHiddenItemCounts: controller.roomHiddenItemCounts,
                roomItemCounts: controller.roomItemCounts,
                onRoomOrderChange: controller.onSetRoomOrder,
                onHiddenRoomsChange: controller.onSetHiddenRoomNames,
              },
            }
          : {}),
      }}
      mobileRoomNavigation={{
        activeRoom,
        onRoomChange: changeRoom,
        rooms,
        hiddenRoomNames: controller.hiddenRoomNames,
      }}
    >
      {sectionContent}
    </DashboardLayout>
  );
}

function areDashboardSectionRouterPropsEqual(
  previous: DashboardSectionRouterProps,
  next: DashboardSectionRouterProps
) {
  const previousController = previous.controller;
  const nextController = next.controller;

  const hasSameCommonFields =
    previousController.activeRoom === nextController.activeRoom &&
    previousController.activeSection === nextController.activeSection &&
    previousController.addableEntityIds === nextController.addableEntityIds &&
    previousController.allViewGrouping === nextController.allViewGrouping &&
    previousController.cardOrders === nextController.cardOrders &&
    previousController.cardSizes === nextController.cardSizes &&
    previousController.changeRoom === nextController.changeRoom &&
    previousController.handleDeleteCard === nextController.handleDeleteCard &&
    previousController.handleRemoveEntity === nextController.handleRemoveEntity &&
    previousController.handleUpdateCard === nextController.handleUpdateCard &&
    previousController.hiddenEntityIds === nextController.hiddenEntityIds &&
    previousController.hiddenRoomNames === nextController.hiddenRoomNames &&
    previousController.isEditMode === nextController.isEditMode &&
    previousController.onOpenAddCardDialog === nextController.onOpenAddCardDialog &&
    previousController.onOpenAddEntityDialog === nextController.onOpenAddEntityDialog &&
    previousController.onSetAllViewGrouping === nextController.onSetAllViewGrouping &&
    previousController.onSetHiddenRoomNames === nextController.onSetHiddenRoomNames &&
    previousController.onSetRoomOrder === nextController.onSetRoomOrder &&
    previousController.onToggleEditMode === nextController.onToggleEditMode &&
    previousController.roomHiddenItemCounts === nextController.roomHiddenItemCounts &&
    previousController.roomItemCounts === nextController.roomItemCounts &&
    previousController.rooms === nextController.rooms &&
    previousController.sectionData === nextController.sectionData &&
    previousController.setActiveSection === nextController.setActiveSection &&
    previousController.updateCardSize === nextController.updateCardSize &&
    previousController.availableDeviceMap === nextController.availableDeviceMap &&
    previousController.deviceMap === nextController.deviceMap &&
    previousController.densePerformanceMode === nextController.densePerformanceMode;

  if (!hasSameCommonFields) {
    return false;
  }

  switch (previousController.activeSection) {
    case 'climate':
      return true;
    case 'energy':
    case 'lights':
      return true;
    default:
      return (
        previousController.allCustomCards === nextController.allCustomCards &&
        previousController.customCards === nextController.customCards &&
        previousController.homeLayout === nextController.homeLayout &&
        previousController.orderedCardIds === nextController.orderedCardIds &&
        previousController.removeHomeCard === nextController.removeHomeCard &&
        previousController.addHomeSection === nextController.addHomeSection &&
        previousController.addHomeColumnSection === nextController.addHomeColumnSection &&
        previousController.addHomeSectionBelow === nextController.addHomeSectionBelow &&
        previousController.moveHomeSection === nextController.moveHomeSection &&
        previousController.moveHomeColumn === nextController.moveHomeColumn &&
        previousController.renameHomeSection === nextController.renameHomeSection &&
        previousController.removeHomeSection === nextController.removeHomeSection &&
        previousController.resizeHomeSection === nextController.resizeHomeSection &&
        previousController.moveHomeCard === nextController.moveHomeCard &&
        previousController.setHomeLayoutMode === nextController.setHomeLayoutMode
      );
  }
}

export const DashboardSectionRouter = memo(
  DashboardSectionRouterComponent,
  areDashboardSectionRouterPropsEqual
);
