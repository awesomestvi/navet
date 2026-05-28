import { Lightbulb, Plus, Sparkles, Thermometer } from 'lucide-react';
import { lazy, type ReactNode, Suspense, useCallback, useMemo, useState } from 'react';
import { getManageableRoomOrder } from '@/app/components/layout/mobile-layout-helpers';
import { RoomNav } from '@/app/components/layout/room-nav';
import { SectionCustomizeShell } from '@/app/components/layout/section-customize-shell';
import { DashboardEmptyState } from '@/app/components/patterns';
import { InteractivePill } from '@/app/components/primitives';
import { LoadingSpinner } from '@/app/components/primitives/loading-spinner';
import { RenderProfiler } from '@/app/components/shared/render-profiler';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID, ENERGY_WIDGET_ROOM, isAllRooms } from '@/app/constants/rooms';
import { buildRoomStatusSummaryItems, InfoBadgeStrip } from '@/app/features/sensors';
import { useTaskRoutines } from '@/app/features/tasks';
import { useI18n, useIntegrationStore, useTheme } from '@/app/hooks';
import { useSettingsStore } from '@/app/stores';
import { integrationSelectors, settingsSelectors } from '@/app/stores/selectors';
import type { DeviceWithType } from '@/app/types/device.types';
import { getDeviceRoomLabel } from '@/app/utils/device-location';
import { AllViewGrid } from '../all-view-grid';
import { DeviceGrid } from '../device-grid';
import type { DashboardController } from '../hooks/use-dashboard-controller';
import { DashboardLayout } from '../shell';
import { AddEntityDialog } from './add-entity-dialog';
import { HomeDashboardOverview } from './home-dashboard-overview';

const SecuritySection = lazy(async () => {
  const module = await import('@/app/components/layout/security-section');
  return { default: module.SecuritySection };
});
const TasksSection = lazy(async () => {
  const module = await import('@/app/components/layout/sections');
  return { default: module.TasksSection };
});
const MediaSection = lazy(async () => {
  const module = await import('@/app/components/layout/media-section');
  return { default: module.MediaSection };
});
const EnergySection = lazy(async () => {
  const module = await import('@/app/features/energy');
  return { default: module.EnergySection };
});
const SettingsSection = lazy(async () => {
  const module = await import('@/app/features/settings');
  return { default: module.SettingsSection };
});

interface DashboardSectionRouterProps {
  controller: DashboardController;
}

type ClimateDashboardGroup = 'hvac' | 'temperature' | 'humidity' | 'airQuality' | 'pressure';

const CLIMATE_DASHBOARD_GROUPS = [
  {
    key: 'hvac',
    titleKey: 'sections.climate.hvac.title',
  },
  {
    key: 'temperature',
    titleKey: 'sections.climate.temperature.title',
  },
  {
    key: 'humidity',
    titleKey: 'sections.climate.humidity.title',
  },
  {
    key: 'airQuality',
    titleKey: 'sections.climate.airQuality.title',
  },
  {
    key: 'pressure',
    titleKey: 'sections.climate.pressure.title',
  },
] as const satisfies Array<{
  key: ClimateDashboardGroup;
  titleKey:
    | 'sections.climate.hvac.title'
    | 'sections.climate.temperature.title'
    | 'sections.climate.humidity.title'
    | 'sections.climate.airQuality.title'
    | 'sections.climate.pressure.title';
}>;

function isActiveRoutine(routine: { enabled?: boolean; state: string }) {
  return (
    routine.enabled === true ||
    ['active', 'on', 'scening'].includes(routine.state.trim().toLowerCase())
  );
}

function getClimateDashboardGroup(device: DeviceWithType): ClimateDashboardGroup | null {
  if (device.type === 'climate' || device.type === 'hvac') {
    return 'hvac';
  }

  if (device.type !== 'sensors') {
    return null;
  }

  switch (String(device.deviceClass ?? '').toLowerCase()) {
    case 'temperature':
      return 'temperature';
    case 'humidity':
      return 'humidity';
    case 'air_quality':
    case 'carbon_dioxide':
      return 'airQuality';
    case 'pressure':
      return 'pressure';
    default:
      return null;
  }
}

export function DashboardSectionRouter({ controller }: DashboardSectionRouterProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const roomDescriptors = useIntegrationStore(integrationSelectors.roomDescriptors);
  const kioskMode = useSettingsStore(settingsSelectors.kioskMode);
  const showSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const routines = useTaskRoutines();
  const [isAddLightEntityDialogOpen, setIsAddLightEntityDialogOpen] = useState(false);
  const [isAddClimateEntityDialogOpen, setIsAddClimateEntityDialogOpen] = useState(false);
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
    updateCardSize,
  } = controller;
  const manageableRooms = getManageableRoomOrder(rooms, roomDescriptors);
  const sectionStackProps = {
    className: 'flex flex-col gap-2 md:gap-6',
  };
  const energyCustomCards = controller.allCustomCards.filter(
    (card) => card.room === ENERGY_WIDGET_ROOM
  );
  const energyOrderedCardIds =
    controller.cardOrders[ENERGY_WIDGET_ROOM]?.filter((id) =>
      energyCustomCards.some((card) => card.id === id)
    ) ?? energyCustomCards.map((card) => card.id);
  const hiddenLightEntityIds = useMemo(
    () => hiddenEntityIds.filter((entityId) => availableDeviceMap.get(entityId)?.type === 'lights'),
    [availableDeviceMap, hiddenEntityIds]
  );
  const allLightDeviceMap = useMemo(
    () =>
      new Map(
        Array.from(availableDeviceMap.entries()).filter(([, device]) => device.type === 'lights')
      ),
    [availableDeviceMap]
  );
  const isClimateDashboardDevice = useCallback(
    (device: DeviceWithType) => getClimateDashboardGroup(device) !== null,
    []
  );
  const climateDeviceMap = useMemo(
    () =>
      new Map(
        Array.from(deviceMap.entries()).filter(([, device]) => isClimateDashboardDevice(device))
      ),
    [deviceMap, isClimateDashboardDevice]
  );
  const allClimateDeviceMap = useMemo(
    () =>
      new Map(
        Array.from(availableDeviceMap.entries()).filter(([, device]) =>
          isClimateDashboardDevice(device)
        )
      ),
    [availableDeviceMap, isClimateDashboardDevice]
  );
  const hiddenClimateEntityIds = useMemo(
    () =>
      Array.from(allClimateDeviceMap.keys()).filter((entityId) => !climateDeviceMap.has(entityId)),
    [allClimateDeviceMap, climateDeviceMap]
  );
  const climateSections = useMemo(() => {
    const groupedIds: Record<ClimateDashboardGroup, string[]> = {
      hvac: [],
      temperature: [],
      humidity: [],
      airQuality: [],
      pressure: [],
    };

    climateDeviceMap.forEach((device) => {
      const group = getClimateDashboardGroup(device);
      if (group) {
        groupedIds[group].push(device.id);
      }
    });

    return CLIMATE_DASHBOARD_GROUPS.map((group) => ({
      ...group,
      orderedIds: groupedIds[group.key],
    })).filter((group) => group.orderedIds.length > 0);
  }, [climateDeviceMap]);
  const totalRoutineCount =
    routines.automations.filter(isActiveRoutine).length +
    routines.quickActions.filter(isActiveRoutine).length;
  const roomStatusSummaryItems = useMemo(() => {
    if (isAllRooms(activeRoom) || !showSummaryBar) {
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
      routineCount,
      temperatureUnit,
    });
  }, [
    activeRoom,
    availableDeviceMap,
    routines.automations,
    routines.quickActions,
    showSummaryBar,
    temperatureUnit,
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

  let sectionContent: ReactNode;

  if (activeSection === 'security') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <SecuritySection />
      </Suspense>
    );
  } else if (activeSection === 'energy') {
    sectionContent = (
      <Suspense fallback={<LoadingSpinner />}>
        <RenderProfiler id="EnergySection">
          <div className="space-y-6">
            <EnergySection />

            {isEditMode || energyCustomCards.length > 0 ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div
                      className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
                    >
                      {t('energy.band.eyebrow')}
                    </div>
                    <h2
                      className={`mt-2 text-lg font-semibold tracking-tight md:text-xl ${surface.textPrimary}`}
                    >
                      {t('energy.customCards.title')}
                    </h2>
                    <p className={`mt-1.5 max-w-2xl text-sm ${surface.textSecondary}`}>
                      {t('energy.customCards.description')}
                    </p>
                  </div>

                  {isEditMode ? (
                    <button
                      type="button"
                      onClick={() => controller.onOpenAddCardDialog()}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${surface.border} ${surface.panelMuted} ${surface.hoverBg} ${surface.textPrimary}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {t('dashboard.addCard.action')}
                    </button>
                  ) : null}
                </div>

                {energyCustomCards.length > 0 ? (
                  <DeviceGrid
                    orderedCardIds={energyOrderedCardIds}
                    deviceMap={new Map<string, DeviceWithType>()}
                    isEditMode={isEditMode}
                    cardSizes={cardSizes}
                    updateCardSize={updateCardSize}
                    customCards={energyCustomCards}
                    onDeleteCard={handleDeleteCard}
                    onUpdateCard={handleUpdateCard}
                  />
                ) : isEditMode ? (
                  <div className="flex h-full items-center justify-center p-6">
                    <DashboardEmptyState
                      icon={Sparkles}
                      title={t('energy.customCards.emptyTitle')}
                      description={t('energy.customCards.emptyDescription')}
                      actionLabel={t('dashboard.addCard.action')}
                      onAction={() => controller.onOpenAddCardDialog()}
                      className="w-full max-w-md"
                    />
                  </div>
                ) : null}
              </section>
            ) : null}
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
      isEditMode && hiddenClimateEntityIds.length > 0 ? (
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
        {climateDeviceMap.size > 0 ? (
          <SectionCustomizeShell
            isEditMode={isEditMode}
            onToggle={onToggleEditMode ?? (() => {})}
            className="relative"
            actions={addHiddenClimateEntityAction}
          >
            <RenderProfiler id="ClimateSection">
              <div className="space-y-8">
                {climateSections.map((section) => (
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
                      deviceMap={climateDeviceMap}
                      isEditMode={isEditMode}
                      cardSizes={cardSizes}
                      updateCardSize={updateCardSize}
                      onRemoveEntity={handleRemoveEntity}
                      allowEntityRemoval
                      usesHideAction
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
                hiddenClimateEntityIds.length > 0
                  ? t('sections.climate.emptyHiddenDescription')
                  : t('sections.climate.emptyDescription')
              }
              actionIcon={Thermometer}
              actionLabel={
                hiddenClimateEntityIds.length > 0 ? t('dashboard.addEntity.title') : undefined
              }
              onAction={hiddenClimateEntityIds.length > 0 ? openAddClimateEntityDialog : undefined}
              className="w-full max-w-md"
            />
          </div>
        )}

        {isAddClimateEntityDialogOpen ? (
          <AddEntityDialog
            open={isAddClimateEntityDialogOpen}
            onClose={closeAddClimateEntityDialog}
            onAddEntity={handleAddClimateEntity}
            currentRoom={ALL_ROOMS_ID}
            deviceMap={allClimateDeviceMap}
            addedEntityIds={[]}
            visibleEntityIds={hiddenClimateEntityIds}
            title={t('dashboard.addEntity.title')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionLabel={t('dashboard.addEntity.action')}
          />
        ) : null}
      </div>
    );
  } else if (activeSection === 'lights') {
    const addHiddenLightEntityAction =
      isEditMode && hiddenLightEntityIds.length > 0 ? (
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
            actions={addHiddenLightEntityAction}
          >
            <RenderProfiler id="LightsSection">
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
              />
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
              onAction={hiddenLightEntityIds.length > 0 ? openAddLightEntityDialog : undefined}
              className="w-full max-w-md"
            />
          </div>
        )}

        {isAddLightEntityDialogOpen ? (
          <AddEntityDialog
            open={isAddLightEntityDialogOpen}
            onClose={closeAddLightEntityDialog}
            onAddEntity={handleAddLightEntity}
            currentRoom={ALL_ROOMS_ID}
            deviceMap={allLightDeviceMap}
            addedEntityIds={[]}
            visibleEntityIds={hiddenLightEntityIds}
            title={t('dashboard.addEntity.title')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionLabel={t('dashboard.addEntity.action')}
          />
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
            allViewGrouping={isAllRooms(activeRoom) ? controller.allViewGrouping : undefined}
            isEditMode={isEditMode}
            onRoomOrderChange={controller.onSetRoomOrder}
            onHiddenRoomsChange={controller.onSetHiddenRoomNames}
            onAllViewGroupingChange={
              isAllRooms(activeRoom) ? controller.onSetAllViewGrouping : undefined
            }
            onToggleEditMode={onToggleEditMode}
            onAddEntity={
              isAllRooms(activeRoom) || addableEntityIds.length === 0
                ? undefined
                : onOpenAddEntityDialog
            }
            addEntityLabel={t('dashboard.addEntity.title')}
          />
        )}

        {isAllRooms(activeRoom) ? (
          <RenderProfiler id="HomeDashboardOverview">
            <HomeDashboardOverview
              deviceMap={controller.availableDeviceMap}
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
            />
          </RenderProfiler>
        ) : (
          <RenderProfiler id={`DeviceGrid:${activeRoom}`}>
            <div className="space-y-2 md:space-y-6">
              <InfoBadgeStrip
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
              />
            </div>
          </RenderProfiler>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout
      mobileEditActions={{
        isEditMode,
        onToggleEditMode,
        onAddEntity:
          isAllRooms(activeRoom) || addableEntityIds.length === 0
            ? undefined
            : onOpenAddEntityDialog,
        addEntityLabel: t('dashboard.addEntity.title'),
        reorderRooms:
          manageableRooms.length > 0
            ? {
                rooms: manageableRooms,
                hiddenRoomNames: controller.hiddenRoomNames,
                roomDescriptors,
                roomHiddenItemCounts: controller.roomHiddenItemCounts,
                roomItemCounts: controller.roomItemCounts,
                onRoomOrderChange: controller.onSetRoomOrder,
                onHiddenRoomsChange: controller.onSetHiddenRoomNames,
              }
            : undefined,
        allViewGrouping: isAllRooms(activeRoom) ? controller.allViewGrouping : undefined,
        onAllViewGroupingChange: isAllRooms(activeRoom)
          ? controller.onSetAllViewGrouping
          : undefined,
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
