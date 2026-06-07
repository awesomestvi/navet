import {
  ALL_ROOMS_ID,
  ENERGY_WIDGET_ROOM,
  HOME_WIDGET_ROOM,
  isAllRooms,
} from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { DeviceCollectionKey } from '@navet/app/hooks';
import {
  buildDashboardVisibilityResult,
  DEVICE_COLLECTION_KEYS,
  getAbsorbedDashboardEntityIds,
  getExpandedHiddenDashboardEntityIds,
  useAggregatedRooms,
  useCardState,
  useDeviceCollectionsByKeys,
  useDeviceMap,
  useEditMode,
  useI18n,
  useIntegrationStore,
  useNavigation,
  usePersistedState,
  useRoomNavigation,
} from '@navet/app/hooks';
import type { Section } from '@navet/app/navigation/sections';
import { isStandaloneMode } from '@navet/app/runtime/app-mode';
import { providerRuntimeSelectors, settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { DeviceCollection, DeviceWithType } from '@navet/app/types/device.types';
import { buildAggregatedRooms } from '@navet/app/utils/provider-rooms';
import { startTransition, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getClimateDashboardGroup } from '../../climate/utils/climate-dashboard-group';
import { buildSecurityCameraDashboardModel } from '../../security/utils/security-camera-dashboard-model';
import type { AllViewGrouping } from '../all-view-grid';
import { useCustomCardsStore } from '../stores/custom-cards-store';
import { useHomeDashboardLayoutStore } from '../stores/home-dashboard-layout-store';
import { useAvailableRooms } from './use-available-rooms';
import { useCardOrdering } from './use-card-ordering';
import { useCardZones } from './use-card-zones';
import { useDashboardCardActions } from './use-dashboard-card-actions';
import type {
  DashboardClimateSectionGroup,
  DashboardController,
  DashboardSectionData,
} from './use-dashboard-controller.types';
import { useDashboardDerivedState } from './use-dashboard-derived-state';
import { useDashboardDevicesLoaded } from './use-dashboard-devices-loaded';
import { useDashboardDialogs } from './use-dashboard-dialogs';
import { useDashboardEntityVisibility } from './use-dashboard-entity-visibility';
import { useDashboardRoomCounts } from './use-dashboard-room-counts';
import { useDashboardRoomNavigation } from './use-dashboard-room-navigation';
import { useEditModeBeforeUnload } from './use-edit-mode-beforeunload';
import { useHomeDashboardLayout } from './use-home-dashboard-layout';
import { useHomeLayoutHydrated } from './use-home-layout-hydrated';
import { useOnboardingController } from './use-onboarding-controller';

const DASHBOARD_DEVICE_SECTION_IDS = new Set(['home', 'lights', 'climate']);
const SECURITY_SECTION_DEVICE_KEYS = [
  'cameras',
  'covers',
  'locks',
  'sensors',
  'persons',
  'helpers',
] as const;
const MEDIA_SECTION_DEVICE_KEYS = ['media'] as const;
const CLIMATE_SECTION_DEVICE_KEYS = ['hvac', 'climate', 'fans', 'switches', 'sensors'] as const;
const LIGHTS_SECTION_DEVICE_KEYS = ['lights'] as const;
const EMPTY_SECTION_DEVICE_KEYS: readonly DeviceCollectionKey[] = [];
const CLIMATE_DASHBOARD_GROUPS: DashboardClimateSectionGroup[] = [
  {
    key: 'hvac',
    titleKey: 'sections.climate.hvac.title',
    orderedIds: [],
  },
  {
    key: 'fans',
    titleKey: 'sections.climate.fans.title',
    orderedIds: [],
  },
  {
    key: 'temperature',
    titleKey: 'sections.climate.temperature.title',
    orderedIds: [],
  },
  {
    key: 'humidity',
    titleKey: 'sections.climate.humidity.title',
    orderedIds: [],
  },
  {
    key: 'airQuality',
    titleKey: 'sections.climate.airQuality.title',
    orderedIds: [],
  },
  {
    key: 'pressure',
    titleKey: 'sections.climate.pressure.title',
    orderedIds: [],
  },
];

export function useDashboardController(): DashboardController {
  const { activeSection, setActiveSection } = useNavigation();
  const { t } = useI18n();
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const currentProviderRuntime = useIntegrationStore(
    providerRuntimeSelectors.currentProviderRuntime
  );
  const connected = currentProviderRuntime.connected;
  const connecting = currentProviderRuntime.connecting;
  const entitiesHydrated = currentProviderRuntime.entitiesHydrated;
  const registriesHydrated = currentProviderRuntime.registriesHydrated;
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [allViewGrouping, setAllViewGrouping] = usePersistedState<AllViewGrouping>(
    STORAGE_KEYS.allViewGrouping,
    'custom'
  );
  const [roomOrder, setRoomOrder] = usePersistedState<string[]>(STORAGE_KEYS.roomOrder, []);
  const [hiddenRoomNames, setHiddenRoomNames] = usePersistedState<string[]>(
    STORAGE_KEYS.hiddenRooms,
    []
  );

  const { hiddenEntityIds, shownSensorEntityIds, hideAutoEntity, showAutoEntity } =
    useDashboardEntityVisibility();

  const homeLayoutCardIds = useHomeDashboardLayoutStore((state) => state.cardIds);
  const isDeviceHeavySection =
    DASHBOARD_DEVICE_SECTION_IDS.has(activeSection) ||
    !['energy', 'media', 'security', 'settings', 'tasks'].includes(activeSection);
  const shouldIncludeFeatureCollections =
    !lowPowerMode ||
    (activeSection === 'home' &&
      homeLayoutCardIds.some(
        (cardId) => cardId.includes('calendar.') || cardId.includes('weather.')
      ));
  const sectionDeviceKeys = useMemo(
    () => resolveDashboardSectionDeviceKeys(activeSection),
    [activeSection]
  );
  const allDevices = useDeviceCollectionsByKeys(sectionDeviceKeys, {
    enabled: sectionDeviceKeys.length > 0,
    includeFeatureCollections:
      sectionDeviceKeys.includes('calendars') || sectionDeviceKeys.includes('weather')
        ? shouldIncludeFeatureCollections
        : false,
  });
  const dashboardVisibility = useMemo(
    () => buildDashboardVisibilityResult(allDevices, hiddenEntityIds, shownSensorEntityIds),
    [allDevices, hiddenEntityIds, shownSensorEntityIds]
  );
  const devices = dashboardVisibility.visibleDevices;
  const availableDevices = dashboardVisibility.availableDevices;
  const countableDevices = useMemo(() => devices, [devices]);
  const aggregatedRooms = useAggregatedRooms();
  const shouldPrepareRoomCounts = sectionDeviceKeys === DEVICE_COLLECTION_KEYS;
  const countableRooms = useMemo(
    () =>
      shouldPrepareRoomCounts ? buildAggregatedRooms(countableDevices) : EMPTY_AGGREGATED_ROOMS,
    [countableDevices, shouldPrepareRoomCounts]
  );
  const visibleRoomsState = useMemo(
    () => (shouldPrepareRoomCounts ? buildAggregatedRooms(devices) : EMPTY_AGGREGATED_ROOMS),
    [devices, shouldPrepareRoomCounts]
  );

  const { roomItemCounts, roomHiddenItemCounts } = useDashboardRoomCounts(
    countableRooms,
    visibleRoomsState
  );

  const { availableRooms } = useAvailableRooms(aggregatedRooms);
  const rooms = usePersistedRoomOrder(availableRooms, roomOrder);
  const visibleRooms = useMemo(() => {
    const hiddenRooms = new Set(hiddenRoomNames);
    return rooms.filter((room) => !hiddenRooms.has(room));
  }, [hiddenRoomNames, rooms]);

  const { activeRoom, preferredRoom, changeRoom, fallbackRoom } = useRoomNavigation(ALL_ROOMS_ID);
  const standaloneMode = isStandaloneMode();

  useDashboardRoomNavigation(
    activeRoom,
    preferredRoom,
    visibleRooms,
    changeRoom,
    fallbackRoom,
    entitiesHydrated,
    devicesLoaded,
    registriesHydrated,
    connected,
    connecting,
    standaloneMode
  );
  useDashboardDevicesLoaded({ connected, connecting, setDevicesLoaded });

  const { isEditMode, toggleEditMode } = useEditMode();
  useEditModeBeforeUnload(isEditMode);

  const dialogs = useDashboardDialogs();
  const allCards = useCustomCardsStore((state) => state.cards);
  const allCustomCards = useMemo(
    () => allCards.filter((card) => isAllRooms(card.room) || card.room === HOME_WIDGET_ROOM),
    [allCards]
  );
  const customCards = useMemo(
    () => allCards.filter((card) => card.room === activeRoom || isAllRooms(card.room)),
    [allCards, activeRoom]
  );
  const { cardSizes, updateCardSize } = useCardState(devices);
  const { cardOrders } = useCardOrdering(devices, rooms, allCustomCards);
  const { cardZones, updateCardZone } = useCardZones();
  const { deviceMap } = useDeviceMap(isDeviceHeavySection ? devices : EMPTY_DEVICE_COLLECTION);
  const { deviceMap: availableDeviceMap } = useDeviceMap(
    isDeviceHeavySection ? availableDevices : EMPTY_DEVICE_COLLECTION
  );

  const homeLayoutValidIds = useHomeLayoutValidIds(availableDeviceMap, allCustomCards);
  const homeLayoutController = useHomeDashboardLayout(homeLayoutValidIds, cardSizes);
  const homeLayoutHydrated = useHomeLayoutHydrated({
    cardIds: homeLayoutController.layout.cardIds,
    availableDeviceMap,
    allCustomCards,
  });

  const { addableEntityIds, allEntityIds, lightDeviceMap, lightRooms, orderedCardIds } =
    useDashboardDerivedState({
      activeRoom,
      absorbedEntityIds: dashboardVisibility.absorbedEntityIds,
      includeLightState: activeSection === 'lights',
      includeOrderedCardIds: isDeviceHeavySection,
      availableDeviceMap,
      cardOrders,
      deviceMap,
      hiddenEntityIds,
      rooms,
    });
  const sectionData = useDashboardSectionData({
    activeSection,
    allCustomCards,
    availableDeviceMap,
    cardOrders,
    deviceMap,
    hiddenEntityIds,
  });
  const securityAlertCount = useMemo(() => {
    const expandedHiddenSecurityIds = new Set(
      getExpandedHiddenDashboardEntityIds(allDevices, hiddenEntityIds)
    );
    const absorbedSecurityIds = new Set(
      getAbsorbedDashboardEntityIds(allDevices, [...expandedHiddenSecurityIds])
    );

    return buildSecurityCameraDashboardModel({
      cameras: allDevices.cameras.filter((device) => !expandedHiddenSecurityIds.has(device.id)),
      covers: (allDevices.covers ?? []).filter(
        (device) => !expandedHiddenSecurityIds.has(device.id)
      ),
      locks: allDevices.locks.filter((device) => !expandedHiddenSecurityIds.has(device.id)),
      sensors: allDevices.sensors.filter(
        (device) => !expandedHiddenSecurityIds.has(device.id) && !absorbedSecurityIds.has(device.id)
      ),
      persons: (allDevices.persons ?? []).filter(
        (device) => !expandedHiddenSecurityIds.has(device.id)
      ),
      helpers: (allDevices.helpers ?? []).filter(
        (device) => !expandedHiddenSecurityIds.has(device.id) && !absorbedSecurityIds.has(device.id)
      ),
    }).summary.attentionEntityCount;
  }, [allDevices, hiddenEntityIds]);

  const resetDashboard = useResetDashboard(homeLayoutController);
  const onboarding = useOnboardingController({ allEntityIds, changeRoom, resetDashboard });

  const { addCard, removeCard, updateCard } = useCustomCardsStore(
    useShallow((state) => ({
      addCard: state.addCard,
      removeCard: state.removeCard,
      updateCard: state.updateCard,
    }))
  );
  const {
    handleAddCard,
    handleAddLibraryCard,
    handleDeleteCard,
    handleAddEntity,
    handleRemoveEntity,
    handleUpdateCard,
  } = useDashboardCardActions({
    activeRoom,
    activeSection,
    isEditMode,
    addCard,
    removeCard,
    updateCard,
    hideAutoEntity,
    showAutoEntity,
    t,
    addCardTargetSectionId: dialogs.addCardTargetSectionId,
    homeLayoutController,
  });

  return {
    activeRoom,
    activeSection,
    addableEntityIds,
    allCustomCards,
    allEntityIds,
    allViewGrouping,
    availableDeviceMap,
    cardOrders,
    cardSizes,
    cardZones,
    changeRoom,
    customCards,
    deviceMap,
    connecting,
    devicesLoaded,
    handleAddCard,
    handleAddLibraryCard,
    handleAddEntity,
    handleDeleteCard,
    handleRemoveEntity,
    handleUpdateCard,
    hiddenEntityIds,
    hiddenRoomNames,
    homeLayout: homeLayoutController.layout,
    homeLayoutHydrated,
    addHomeCard: homeLayoutController.addCard,
    removeHomeCard: homeLayoutController.removeCard,
    moveHomeCard: homeLayoutController.moveCard,
    setHomeLayoutMode: homeLayoutController.setMode,
    addHomeSection: homeLayoutController.addSection,
    addHomeColumnSection: homeLayoutController.addColumnSection,
    addHomeSectionBelow: homeLayoutController.addSectionBelow,
    moveHomeSection: homeLayoutController.moveSection,
    moveHomeColumn: homeLayoutController.moveColumn,
    renameHomeSection: homeLayoutController.renameSection,
    removeHomeSection: homeLayoutController.removeSection,
    resizeHomeSection: homeLayoutController.resizeSection,
    isEditMode,
    lightDeviceMap,
    lightRooms,
    onSetAllViewGrouping: setAllViewGrouping,
    onSetHiddenRoomNames: setHiddenRoomNames,
    onToggleEditMode: () => startTransition(toggleEditMode),
    onSetRoomOrder: setRoomOrder,
    orderedCardIds,
    roomHiddenItemCounts,
    roomItemCounts,
    rooms,
    sectionData,
    securityAlertCount,
    setActiveSection,
    updateCardSize,
    updateCardZone,
    ...onboarding,
    ...dialogs,
  };
}

function useDashboardSectionData({
  activeSection,
  allCustomCards,
  availableDeviceMap,
  cardOrders,
  deviceMap,
  hiddenEntityIds,
}: {
  activeSection: DashboardController['activeSection'];
  allCustomCards: DashboardController['allCustomCards'];
  availableDeviceMap: DashboardController['availableDeviceMap'];
  cardOrders: DashboardController['cardOrders'];
  deviceMap: DashboardController['deviceMap'];
  hiddenEntityIds: string[];
}): DashboardSectionData {
  const hiddenLightEntityIds = useMemo(
    () =>
      activeSection === 'lights'
        ? hiddenEntityIds.filter((entityId) => availableDeviceMap.get(entityId)?.type === 'lights')
        : [],
    [activeSection, availableDeviceMap, hiddenEntityIds]
  );
  const allLightDeviceMap = useMemo(
    () =>
      activeSection === 'lights'
        ? new Map(
            Array.from(availableDeviceMap.entries()).filter(
              ([, device]) => device.type === 'lights'
            )
          )
        : new Map<string, DeviceWithType>(),
    [activeSection, availableDeviceMap]
  );
  const climateDeviceMap = useMemo(
    () =>
      activeSection === 'climate'
        ? new Map(
            Array.from(deviceMap.entries()).filter(
              ([, device]) => getClimateDashboardGroup(device) !== null
            )
          )
        : new Map<string, DeviceWithType>(),
    [activeSection, deviceMap]
  );
  const allClimateDeviceMap = useMemo(
    () =>
      activeSection === 'climate'
        ? new Map(
            Array.from(availableDeviceMap.entries()).filter(
              ([, device]) => getClimateDashboardGroup(device) !== null
            )
          )
        : new Map<string, DeviceWithType>(),
    [activeSection, availableDeviceMap]
  );
  const hiddenClimateEntityIds = useMemo(
    () =>
      activeSection === 'climate'
        ? Array.from(allClimateDeviceMap.keys()).filter(
            (entityId) => !climateDeviceMap.has(entityId)
          )
        : [],
    [activeSection, allClimateDeviceMap, climateDeviceMap]
  );
  const climateSections = useMemo(() => {
    if (activeSection !== 'climate') {
      return [];
    }

    const groupedIds: Record<DashboardClimateSectionGroup['key'], string[]> = {
      hvac: [],
      fans: [],
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
  }, [activeSection, climateDeviceMap]);
  const energyCustomCards = useMemo(
    () => allCustomCards.filter((card) => card.room === ENERGY_WIDGET_ROOM),
    [allCustomCards]
  );
  const energyOrderedCardIds = useMemo(
    () =>
      activeSection === 'energy'
        ? (cardOrders[ENERGY_WIDGET_ROOM]?.filter((id) =>
            energyCustomCards.some((card) => card.id === id)
          ) ?? energyCustomCards.map((card) => card.id))
        : [],
    [activeSection, cardOrders, energyCustomCards]
  );

  return useMemo(
    () => ({
      isOverviewSection: ![
        'security',
        'energy',
        'tasks',
        'climate',
        'lights',
        'media',
        'settings',
      ].includes(activeSection),
      energyCustomCards,
      energyOrderedCardIds,
      hiddenLightEntityIds,
      allLightDeviceMap,
      climateDeviceMap,
      allClimateDeviceMap,
      hiddenClimateEntityIds,
      climateSections,
    }),
    [
      activeSection,
      allClimateDeviceMap,
      allLightDeviceMap,
      climateDeviceMap,
      climateSections,
      energyCustomCards,
      energyOrderedCardIds,
      hiddenClimateEntityIds,
      hiddenLightEntityIds,
    ]
  );
}

const EMPTY_DEVICE_COLLECTION: DeviceCollection = {
  lights: [],
  fans: [],
  hvac: [],
  climate: [],
  media: [],
  weather: [],
  switches: [],
  helpers: [],
  covers: [],
  locks: [],
  scenes: [],
  persons: [],
  sensors: [],
  vacuums: [],
  calendars: [],
  cameras: [],
  'grouped-sensors': [],
};
const EMPTY_AGGREGATED_ROOMS = buildAggregatedRooms(EMPTY_DEVICE_COLLECTION);

function usePersistedRoomOrder(availableRooms: string[], roomOrder: string[]) {
  return useMemo(() => {
    const preserved = roomOrder.filter((room) => availableRooms.includes(room));
    const additions = availableRooms.filter((room) => !preserved.includes(room));
    return [...preserved, ...additions];
  }, [availableRooms, roomOrder]);
}

function useHomeLayoutValidIds(
  availableDeviceMap: Map<string, DeviceWithType>,
  allCustomCards: Array<{ id: string }>
) {
  return useMemo(
    () => [...availableDeviceMap.keys(), ...allCustomCards.map((card) => card.id)],
    [availableDeviceMap, allCustomCards]
  );
}

function useResetDashboard(homeLayoutController: ReturnType<typeof useHomeDashboardLayout>) {
  return useCallback(() => {
    homeLayoutController.resetLayout();
    useCustomCardsStore.getState().replaceCards([]);
  }, [homeLayoutController]);
}

export { getClimateDashboardGroup } from '../../climate/utils/climate-dashboard-group';

export function resolveDashboardSectionDeviceKeys(
  activeSection: Section
): readonly DeviceCollectionKey[] {
  if (activeSection === 'lights') {
    return LIGHTS_SECTION_DEVICE_KEYS;
  }

  if (activeSection === 'climate') {
    return CLIMATE_SECTION_DEVICE_KEYS;
  }

  if (activeSection === 'media') {
    return MEDIA_SECTION_DEVICE_KEYS;
  }

  if (activeSection === 'security') {
    return SECURITY_SECTION_DEVICE_KEYS;
  }

  if (['energy', 'settings', 'tasks'].includes(activeSection)) {
    return EMPTY_SECTION_DEVICE_KEYS;
  }

  return DEVICE_COLLECTION_KEYS;
}
export type { DashboardController } from './use-dashboard-controller.types';
