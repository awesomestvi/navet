import { getManageableRoomOrder } from '@navet/app/components/layout/mobile-layout-helpers';
import { RoomNav } from '@navet/app/components/layout/room-nav';
import type { RoomNavigationGroup } from '@navet/app/components/layout/room-nav.utils';
import { RoomOrderDialog } from '@navet/app/components/layout/room-order-dialog';
import { SectionCustomizeShell } from '@navet/app/components/layout/section-customize-shell';
import { DashboardEmptyState } from '@navet/app/components/patterns';
import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@navet/app/components/shared/render-profiler';
import { ALL_ROOMS_ID, isAllRooms } from '@navet/app/constants/rooms';
import { getRoomTodayChores } from '@navet/app/features/chores/chore-dashboard-selectors';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { useChoreWorkspaceSync } from '@navet/app/features/chores/use-chore-workspace-sync';
import { getClimateDashboardGroup } from '@navet/app/features/climate/utils/climate-dashboard-group';
import { useRoomWorkspaceStore } from '@navet/app/features/dashboard/rooms/room-workspace-store';
import { getRoomWorkspaceSectionsV2 } from '@navet/app/features/dashboard/rooms/room-workspace-v2';
import {
  getEnergyOverviewTemplateLayout,
  useEnergyOverviewLayout,
} from '@navet/app/features/energy/components/dashboard/energy-overview-layout';
import { buildRoomStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useTaskRoutines } from '@navet/app/features/tasks/hooks/use-task-automation-groups';
import { useI18n, useIntegrationStore } from '@navet/app/hooks';
import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { integrationSelectors, settingsSelectors } from '@navet/app/stores/selectors';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { getChoreTiming } from '@navet/core/chores';
import { Lightbulb, Thermometer } from 'lucide-react';
import {
  lazy,
  memo,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DeviceGrid } from '../device-grid';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { DashboardLayout } from '../shell';
import { EmbeddedSidebarPage } from './embedded-sidebar-page';
import { HomeEditCommandBar } from './home-edit-command-bar';

const SecuritySection = lazy(async () => {
  const module = await import('@navet/app/components/layout/security-section');
  return { default: module.SecuritySection };
});
const HomeDashboardOverview = lazy(async () => {
  const module = await import('./home-dashboard-overview');
  return { default: module.HomeDashboardOverview };
});
const HouseholdSection = lazy(async () => {
  const module = await import('@navet/app/features/chores/components/household-section');
  return { default: module.HouseholdSection };
});
const TasksSection = lazy(async () => {
  const module = await import('@navet/app/features/tasks/components/tasks-section');
  return { default: module.TasksSection };
});
const RoomChoreCard = lazy(() => import('@navet/app/features/chores/components/room-chore-card'));
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
const NavetAiSection = lazy(async () => {
  const module = await import('@navet/app/features/navet-ai/components/navet-ai-section');
  return { default: module.NavetAiSection };
});
const LightsDashboard = lazy(async () => {
  const module = await import('@navet/app/features/lighting/dashboard/lights-dashboard');
  return { default: module.LightsDashboard };
});
const ClimateDashboard = lazy(async () => {
  const module = await import('@navet/app/features/climate');
  return { default: module.ClimateDashboard };
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

export function shouldSubscribeTaskRoutines(
  activeSection: DashboardController['activeSection'],
  showSummaryBar: boolean
) {
  return activeSection === 'lights' || (activeSection === 'home' && showSummaryBar);
}

function DashboardSectionRouterComponent({ controller }: DashboardSectionRouterProps) {
  const { t } = useI18n();
  const manageableRoomsByProviderId = useIntegrationStore(
    integrationSelectors.manageableRoomsByProviderId
  );
  const kioskMode = useSettingsStore(settingsSelectors.kioskMode);
  const showSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const choresEnabled = useSettingsStore(settingsSelectors.choresEnabled);
  const roomWorkspace = useRoomWorkspaceStore((state) => state.workspace);
  const choreWorkspace = useChoreWorkspaceStore((state) => state.data);
  const activeCustomSidebarActionId = useNavigationStore(
    (state) => state.activeCustomSidebarActionId
  );
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);
  const customSidebarActions = useSettingsStore(settingsSelectors.customSidebarActions);
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const routines = useTaskRoutines({
    enabled: shouldSubscribeTaskRoutines(controller.activeSection, showSummaryBar),
  });
  const [isAddLightEntityDialogOpen, setIsAddLightEntityDialogOpen] = useState(false);
  const [isAddClimateEntityDialogOpen, setIsAddClimateEntityDialogOpen] = useState(false);
  const [isRoomManagementOpen, setIsRoomManagementOpen] = useState(false);
  const [isEnergyKpiCustomizationOpen, setIsEnergyKpiCustomizationOpen] = useState(false);
  const [isSecurityOverviewCustomizationOpen, setIsSecurityOverviewCustomizationOpen] =
    useState(false);
  const [, setEnergyOverviewLayout] = useEnergyOverviewLayout();
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
    dashboardRooms,
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
  useEffect(() => {
    if (activeSection !== 'energy' || !isEditMode) {
      setIsEnergyKpiCustomizationOpen(false);
    }
  }, [activeSection, isEditMode]);
  useEffect(() => {
    if (activeSection !== 'security' || !isEditMode) {
      setIsSecurityOverviewCustomizationOpen(false);
    }
  }, [activeSection, isEditMode]);
  useChoreWorkspaceSync(choresEnabled && activeSection === 'home' && !isAllRooms(activeRoom));
  const activeRoomWorkspace = useMemo(
    () => roomWorkspace?.rooms.find((room) => room.displayName === activeRoom),
    [activeRoom, roomWorkspace]
  );
  const roomChoreNow = useMemo(() => new Date(), [activeRoom, choreWorkspace]);
  const roomTodayChores = useMemo(
    () =>
      choresEnabled && choreWorkspace && !isAllRooms(activeRoom)
        ? getRoomTodayChores(
            choreWorkspace,
            {
              label: activeRoom,
              canonicalIds: activeRoomWorkspace?.sourceRefs.map((source) => source.canonicalId),
            },
            roomChoreNow
          )
        : [],
    [activeRoom, activeRoomWorkspace, choreWorkspace, choresEnabled, roomChoreNow]
  );
  const pendingRoomChores = useMemo(
    () => roomTodayChores.filter((occurrence) => occurrence.status !== 'done'),
    [roomTodayChores]
  );
  const overdueRoomChoreCount = useMemo(
    () =>
      pendingRoomChores.filter(
        (occurrence) => getChoreTiming(occurrence, roomChoreNow) === 'overdue'
      ).length,
    [pendingRoomChores, roomChoreNow]
  );
  const manageableRoomReferences = useMemo(
    () => Object.values(manageableRoomsByProviderId).flat(),
    [manageableRoomsByProviderId]
  );
  const manageableRooms = getManageableRoomOrder(rooms, manageableRoomReferences);
  const dashboardEntityIds = useMemo(
    () => Array.from(availableDeviceMap.keys()),
    [availableDeviceMap]
  );
  const dashboardVisibleEntityIds = useMemo(() => Array.from(deviceMap.keys()), [deviceMap]);
  const roomNavigationGroups = useMemo<RoomNavigationGroup[]>(() => {
    const availableRoomNames = new Set(dashboardRooms);

    return getRoomWorkspaceSectionsV2(roomWorkspace).flatMap((section) => {
      if (!section.group) {
        return [];
      }
      const groupedRoomNames = section.rooms
        .map((room) => room.displayName)
        .filter((roomName) => availableRoomNames.has(roomName));

      return groupedRoomNames.length > 0
        ? [
            {
              id: section.group.id,
              name: section.group.displayName,
              rooms: groupedRoomNames,
              symbol: section.group.symbol,
            },
          ]
        : [];
    });
  }, [dashboardRooms, roomWorkspace]);
  const roomManagement =
    activeSection === 'home' && manageableRooms.length > 0
      ? {
          rooms: manageableRooms,
          hiddenRoomNames: controller.hiddenRoomNames,
          manageableRooms: manageableRoomReferences,
          roomHiddenItemCounts: controller.roomHiddenItemCounts,
          roomItemCounts: controller.roomItemCounts,
          dashboardEntityIds,
          dashboardVisibleEntityIds,
          onRoomOrderChange: controller.onSetRoomOrder,
          onHiddenRoomsChange: controller.onSetHiddenRoomNames,
        }
      : undefined;
  const isHomeOverviewEditMode = activeSection === 'home' && isEditMode && isAllRooms(activeRoom);
  const sectionStackProps = {
    className: 'flex flex-col gap-2 md:gap-4 min-[1025px]:gap-6',
  };
  const totalRoutineCount =
    routines.automations.filter(isActiveRoutine).length +
    routines.quickActions.filter(isActiveRoutine).length;
  const lightScenes = useMemo(
    () => routines.quickActions.filter((routine) => routine.type === 'scene'),
    [routines.quickActions]
  );
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

    return buildRoomStatusSummaryItems(
      availableDeviceMap,
      activeRoom,
      {
        climateEntityIds: roomClimateEntityIds,
        pendingChoreCount: roomTodayChores.length > 0 ? pendingRoomChores.length : undefined,
        overdueChoreCount: overdueRoomChoreCount,
        routineCount,
        securityAlertCount: controller.activeRoomSecurityAlertCount,
        temperatureUnit,
      },
      t
    );
  }, [
    activeRoom,
    availableDeviceMap,
    pendingRoomChores.length,
    overdueRoomChoreCount,
    roomClimateEntityIds,
    controller.activeRoomSecurityAlertCount,
    roomTodayChores.length,
    routines.automations,
    routines.quickActions,
    showSummaryBar,
    temperatureUnit,
    t,
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
  const headerAddAction = (() => {
    if (!isEditMode) {
      return canOpenAddEntityDialog ? onOpenAddEntityDialog : undefined;
    }

    if (activeSection === 'home' || activeSection === 'energy') {
      return controller.onOpenAddCardDialog;
    }

    if (activeSection === 'security') {
      return openSecurityAddEntityDialog;
    }

    if (activeSection === 'lights' && sectionData.hiddenLightEntityIds.length > 0) {
      return openAddLightEntityDialog;
    }

    if (activeSection === 'climate' && sectionData.hiddenClimateEntityIds.length > 0) {
      return openAddClimateEntityDialog;
    }

    return canOpenAddEntityDialog ? onOpenAddEntityDialog : undefined;
  })();
  const headerAddLabel =
    isEditMode && (activeSection === 'home' || activeSection === 'energy')
      ? t('dashboard.roomNav.addCard')
      : t('dashboard.addEntity.title');
  const embeddedSidebarAction =
    activeCustomSidebarActionId === null
      ? null
      : (customSidebarActions.find(
          (action) =>
            action.id === activeCustomSidebarActionId &&
            action.targetType === 'iframe' &&
            Boolean(action.targetUrl)
        ) ?? null);

  useEffect(() => {
    if (activeCustomSidebarActionId !== null && embeddedSidebarAction === null) {
      setActiveSection('home');
    }
  }, [activeCustomSidebarActionId, embeddedSidebarAction, setActiveSection]);

  let sectionContent: ReactNode;

  if (activeCustomSidebarActionId !== null && embeddedSidebarAction === null) {
    sectionContent = null;
  } else if (embeddedSidebarAction) {
    sectionContent = (
      <RenderProfiler id="EmbeddedSidebarPage">
        <EmbeddedSidebarPage
          title={embeddedSidebarAction.label}
          url={embeddedSidebarAction.targetUrl ?? ''}
        />
      </RenderProfiler>
    );
  } else if (activeSection === 'security') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <SecuritySection
          openAddEntityRequestKey={securityAddEntityRequestKey}
          suppressEditActions={isEditMode}
          isOverviewCustomizationOpen={isSecurityOverviewCustomizationOpen}
          onOverviewCustomizationOpenChange={setIsSecurityOverviewCustomizationOpen}
        />
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
              isKpiCustomizationOpen={isEnergyKpiCustomizationOpen}
              onDeleteCard={handleDeleteCard}
              onKpiCustomizationOpenChange={setIsEnergyKpiCustomizationOpen}
              onUpdateCard={handleUpdateCard}
            />
          </div>
        </RenderProfiler>
      </Suspense>
    );
  } else if (activeSection === 'tasks') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        {choresEnabled ? <HouseholdSection /> : <TasksSection />}
      </Suspense>
    );
  } else if (activeSection === 'climate') {
    sectionContent = (
      <div {...sectionStackProps} className="relative flex flex-col gap-2 md:gap-6">
        {sectionData.climateDeviceMap.size > 0 ? (
          <SectionCustomizeShell
            isEditMode={isEditMode}
            onToggle={onToggleEditMode ?? (() => {})}
            className="relative"
            actions={null}
            showCustomizeButton={false}
          >
            <RenderProfiler id="ClimateSection">
              <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
                <ClimateDashboard
                  deviceMap={sectionData.climateDeviceMap}
                  sections={sectionData.climateSections}
                  temperatureUnit={temperatureUnit}
                  cardSizes={cardSizes}
                  updateCardSize={updateCardSize}
                  isEditMode={isEditMode}
                  onRemoveEntity={handleRemoveEntity}
                  densePerformanceMode={controller.densePerformanceMode}
                  optimizeOffscreenPaint={controller.optimizeOffscreenPaint}
                />
              </Suspense>
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
    sectionContent = (
      <div {...sectionStackProps} className="relative flex flex-col gap-2 md:gap-6">
        {lightDeviceMap.size > 0 ? (
          <SectionCustomizeShell
            isEditMode={isEditMode}
            onToggle={onToggleEditMode ?? (() => {})}
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
  } else if (activeSection === 'ai') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner message="Loading Navet AI" />}>
        <RenderProfiler id="NavetAiSection">
          <NavetAiSection />
        </RenderProfiler>
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
            rooms={dashboardRooms}
            hiddenRoomNames={controller.hiddenRoomNames}
            roomHiddenItemCounts={controller.roomHiddenItemCounts}
            roomItemCounts={controller.roomItemCounts}
            dashboardEntityIds={dashboardEntityIds}
            dashboardVisibleEntityIds={dashboardVisibleEntityIds}
            roomGroups={roomNavigationGroups}
            activeRoom={activeRoom}
            onRoomChange={changeRoom}
            isEditMode={isEditMode}
            onRoomOrderChange={controller.onSetRoomOrder}
            onHiddenRoomsChange={controller.onSetHiddenRoomNames}
            onToggleEditMode={onToggleEditMode}
            onAddEntity={headerAddAction}
            addEntityLabel={headerAddLabel}
            suppressEditActions={isEditMode}
            showCustomizeButton={false}
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
                canRedoHomeLayout={controller.canRedoHomeLayout}
                canUndoHomeLayout={controller.canUndoHomeLayout}
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
                redoHomeLayout={controller.redoHomeLayout}
                undoHomeLayout={controller.undoHomeLayout}
                onOpenAddCardDialog={controller.onOpenAddCardDialog}
                onApplyDashboardPack={controller.handleApplyDashboardPack}
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
            <SummaryBarStack>
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
                key={`room-grid-${activeRoom}`}
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
                optimizeOffscreenPaint={controller.optimizeOffscreenPaint}
                supplementalCards={pendingRoomChores.map((occurrence) => ({
                  id: `room-chore-${occurrence.id}`,
                  size: 'medium',
                  content: choreWorkspace ? (
                    <Suspense fallback={null}>
                      <RoomChoreCard
                        data={choreWorkspace}
                        occurrence={occurrence}
                        now={roomChoreNow}
                      />
                    </Suspense>
                  ) : null,
                }))}
              />
            </SummaryBarStack>
          </RenderProfiler>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout
      densePerformanceMode={controller.densePerformanceMode}
      mobileEditActions={
        isEditMode || activeSection === 'tasks'
          ? undefined
          : {
              isEditMode,
              onToggleEditMode,
              onAddEntity: headerAddAction,
              addEntityLabel: headerAddLabel,
              ...(roomManagement ? { reorderRooms: roomManagement } : {}),
            }
      }
      mobileRoomNavigation={{
        activeRoom,
        onRoomChange: changeRoom,
        rooms: dashboardRooms,
        hiddenRoomNames: controller.hiddenRoomNames,
        groups: roomNavigationGroups,
      }}
    >
      {isEditMode ? (
        <>
          <HomeEditCommandBar
            addActionLabel={headerAddLabel}
            canRedo={isHomeOverviewEditMode ? controller.canRedoHomeLayout : undefined}
            canUndo={isHomeOverviewEditMode ? controller.canUndoHomeLayout : undefined}
            homeLayoutMode={isHomeOverviewEditMode ? controller.homeLayout.mode : undefined}
            onAddCard={headerAddAction}
            onAddColumn={
              isHomeOverviewEditMode && controller.homeLayout.mode === 'sectioned'
                ? () => controller.addHomeColumnSection()
                : undefined
            }
            onAddRow={
              isHomeOverviewEditMode && controller.homeLayout.mode === 'sectioned'
                ? () => controller.addHomeSection()
                : undefined
            }
            onApplyPack={isHomeOverviewEditMode ? controller.handleApplyDashboardPack : undefined}
            onApplyEnergyLayout={
              activeSection === 'energy'
                ? (template) => setEnergyOverviewLayout(getEnergyOverviewTemplateLayout(template))
                : undefined
            }
            onConfigureKpis={
              activeSection === 'energy' ? () => setIsEnergyKpiCustomizationOpen(true) : undefined
            }
            onConfigureSecurityOverview={
              activeSection === 'security'
                ? () => setIsSecurityOverviewCustomizationOpen(true)
                : undefined
            }
            onManageRooms={roomManagement ? () => setIsRoomManagementOpen(true) : undefined}
            onRedo={isHomeOverviewEditMode ? controller.redoHomeLayout : undefined}
            onSetLayoutMode={isHomeOverviewEditMode ? controller.setHomeLayoutMode : undefined}
            onToggleEditMode={onToggleEditMode}
            onUndo={isHomeOverviewEditMode ? controller.undoHomeLayout : undefined}
          />
          {roomManagement ? (
            <RoomOrderDialog
              isOpen={isRoomManagementOpen}
              onOpenChange={setIsRoomManagementOpen}
              rooms={roomManagement.rooms}
              hiddenRoomNames={roomManagement.hiddenRoomNames}
              manageableRooms={roomManagement.manageableRooms}
              roomHiddenItemCounts={roomManagement.roomHiddenItemCounts}
              roomEntityCounts={roomManagement.roomItemCounts}
              dashboardEntityIds={roomManagement.dashboardEntityIds}
              dashboardVisibleEntityIds={roomManagement.dashboardVisibleEntityIds}
              onRoomOrderChange={roomManagement.onRoomOrderChange}
              onHiddenRoomsChange={roomManagement.onHiddenRoomsChange}
            />
          ) : null}
        </>
      ) : null}
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
    previousController.dashboardRooms === nextController.dashboardRooms &&
    previousController.handleAddEntity === nextController.handleAddEntity &&
    previousController.handleApplyDashboardPack === nextController.handleApplyDashboardPack &&
    previousController.handleDeleteCard === nextController.handleDeleteCard &&
    previousController.handleRemoveEntity === nextController.handleRemoveEntity &&
    previousController.handleUpdateCard === nextController.handleUpdateCard &&
    previousController.hiddenEntityIds === nextController.hiddenEntityIds &&
    previousController.hiddenRoomNames === nextController.hiddenRoomNames &&
    previousController.isEditMode === nextController.isEditMode &&
    previousController.lightDeviceMap === nextController.lightDeviceMap &&
    previousController.lightRooms === nextController.lightRooms &&
    previousController.onOpenAddCardDialog === nextController.onOpenAddCardDialog &&
    previousController.onOpenAddEntityDialog === nextController.onOpenAddEntityDialog &&
    previousController.onSetAllViewGrouping === nextController.onSetAllViewGrouping &&
    previousController.onSetHiddenRoomNames === nextController.onSetHiddenRoomNames &&
    previousController.onSetRoomOrder === nextController.onSetRoomOrder &&
    previousController.onToggleEditMode === nextController.onToggleEditMode &&
    previousController.roomHiddenItemCounts === nextController.roomHiddenItemCounts &&
    previousController.roomItemCounts === nextController.roomItemCounts &&
    previousController.rooms === nextController.rooms &&
    previousController.securityAlertCount === nextController.securityAlertCount &&
    previousController.activeRoomSecurityAlertCount ===
      nextController.activeRoomSecurityAlertCount &&
    previousController.sectionData === nextController.sectionData &&
    previousController.setActiveSection === nextController.setActiveSection &&
    previousController.updateCardSize === nextController.updateCardSize &&
    previousController.availableDeviceMap === nextController.availableDeviceMap &&
    previousController.deviceMap === nextController.deviceMap &&
    previousController.densePerformanceMode === nextController.densePerformanceMode &&
    previousController.optimizeOffscreenPaint === nextController.optimizeOffscreenPaint;

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
        previousController.canRedoHomeLayout === nextController.canRedoHomeLayout &&
        previousController.canUndoHomeLayout === nextController.canUndoHomeLayout &&
        previousController.homeLayout === nextController.homeLayout &&
        previousController.orderedCardIds === nextController.orderedCardIds &&
        previousController.removeHomeCard === nextController.removeHomeCard &&
        previousController.redoHomeLayout === nextController.redoHomeLayout &&
        previousController.addHomeSection === nextController.addHomeSection &&
        previousController.addHomeColumnSection === nextController.addHomeColumnSection &&
        previousController.addHomeSectionBelow === nextController.addHomeSectionBelow &&
        previousController.moveHomeSection === nextController.moveHomeSection &&
        previousController.moveHomeColumn === nextController.moveHomeColumn &&
        previousController.renameHomeSection === nextController.renameHomeSection &&
        previousController.removeHomeSection === nextController.removeHomeSection &&
        previousController.resizeHomeSection === nextController.resizeHomeSection &&
        previousController.moveHomeCard === nextController.moveHomeCard &&
        previousController.setHomeLayoutMode === nextController.setHomeLayoutMode &&
        previousController.undoHomeLayout === nextController.undoHomeLayout
      );
  }
}

export const DashboardSectionRouter = memo(
  DashboardSectionRouterComponent,
  areDashboardSectionRouterPropsEqual
);
