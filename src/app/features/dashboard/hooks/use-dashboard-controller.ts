import { startTransition, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import {
  useCardState,
  useDashboardDevices,
  useDeviceMap,
  useEditMode,
  useHomeAssistant,
  useI18n,
  useNavigation,
  usePersistedState,
  useRoomNavigation,
} from '@/app/hooks';
import { useDevices, useRooms } from '@/app/hooks/use-devices';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { DeviceWithType } from '@/app/types/device.types';
import type { AllViewGrouping } from '../all-view-grid';
import { HOME_WIDGET_ROOM, useCustomCardsStore } from '../stores/custom-cards-store';
import { useAvailableRooms } from './use-available-rooms';
import { useCardOrdering } from './use-card-ordering';
import { useCardZones } from './use-card-zones';
import { useDashboardCardActions } from './use-dashboard-card-actions';
import type { DashboardController } from './use-dashboard-controller.types';
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

export function useDashboardController(): DashboardController {
  const { activeSection, setActiveSection } = useNavigation();
  const { t } = useI18n();
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const hassEntitiesHydrated = useHomeAssistant((state) => state.entities != null);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [allViewGrouping, setAllViewGrouping] = usePersistedState<AllViewGrouping>(
    STORAGE_KEYS.allViewGrouping,
    'custom'
  );
  const [roomOrder, setRoomOrder] = usePersistedState<string[]>(STORAGE_KEYS.roomOrder, []);

  const { hiddenEntityIds, hideAutoEntity, showAutoEntity } = useDashboardEntityVisibility();

  const allDevices = useDevices();
  const devices = useDashboardDevices(allDevices, hiddenEntityIds);
  const discoveredRooms = useRooms(devices);

  const { roomItemCounts, roomHiddenItemCounts } = useDashboardRoomCounts(allDevices, devices);

  const { availableRooms } = useAvailableRooms(areas, discoveredRooms);
  const rooms = usePersistedRoomOrder(availableRooms, roomOrder);

  const { activeRoom, changeRoom } = useRoomNavigation('All');

  useDashboardRoomNavigation(activeRoom, rooms, changeRoom, hassEntitiesHydrated, devicesLoaded);
  useDashboardDevicesLoaded({ connected, connecting, setDevicesLoaded });

  const { isEditMode, toggleEditMode } = useEditMode();
  useEditModeBeforeUnload(isEditMode);

  const dialogs = useDashboardDialogs();
  const allCards = useCustomCardsStore((state) => state.cards);
  const allCustomCards = useMemo(
    () => allCards.filter((card) => card.room === 'All' || card.room === HOME_WIDGET_ROOM),
    [allCards]
  );
  const customCards = useMemo(
    () => allCards.filter((card) => card.room === activeRoom || card.room === 'All'),
    [allCards, activeRoom]
  );
  const { cardSizes, updateCardSize } = useCardState(devices);
  const { cardOrders } = useCardOrdering(devices, rooms, allCustomCards);
  const { cardZones, updateCardZone } = useCardZones();
  const { deviceMap } = useDeviceMap(devices);
  const { deviceMap: availableDeviceMap } = useDeviceMap(allDevices);

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
      availableDeviceMap,
      cardOrders,
      deviceMap,
      hiddenEntityIds,
      rooms,
    });

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
    deviceMap,
    availableDeviceMap,
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
    onToggleEditMode: () => startTransition(toggleEditMode),
    onSetRoomOrder: setRoomOrder,
    orderedCardIds,
    roomHiddenItemCounts,
    roomItemCounts,
    rooms,
    setActiveSection,
    updateCardSize,
    updateCardZone,
    ...onboarding,
    ...dialogs,
  };
}

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

export type { DashboardController } from './use-dashboard-controller.types';
