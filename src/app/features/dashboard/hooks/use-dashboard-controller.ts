import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { AllViewGrouping } from '../all-view-grid';
import { useCustomCardsStore } from '../stores/custom-cards-store';
import { useCardOrdering } from './use-card-ordering';
import { useCardZones } from './use-card-zones';
import { useCustomCards } from './use-custom-cards';
import { useDashboardCardActions } from './use-dashboard-card-actions';
import type { DashboardController } from './use-dashboard-controller.types';
import { useDashboardDerivedState } from './use-dashboard-derived-state';
import { useDashboardDevicesLoaded } from './use-dashboard-devices-loaded';
import { useDashboardDialogs } from './use-dashboard-dialogs';
import { useDashboardEntityVisibility } from './use-dashboard-entity-visibility';
import { useEditModeBeforeUnload } from './use-edit-mode-beforeunload';
import { useHomeDashboardLayout } from './use-home-dashboard-layout';
import { useHomeLayoutHydrated } from './use-home-layout-hydrated';
import { useOnboardingController } from './use-onboarding-controller';

export function useDashboardController(): DashboardController {
  const { activeSection, setActiveSection } = useNavigation();
  const { t } = useI18n();
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  /** Avoid subscribing to the full entities map — only hydration matters for room edge cases. */
  const hassEntitiesHydrated = useHomeAssistant((state) => state.entities != null);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [allViewGrouping, setAllViewGrouping] = usePersistedState<AllViewGrouping>(
    STORAGE_KEYS.allViewGrouping,
    'custom'
  );

  const { hiddenEntityIds, hideAutoEntity, showAutoEntity } = useDashboardEntityVisibility();

  const allDevices = useDevices();
  const devices = useDashboardDevices(allDevices, hiddenEntityIds);
  const rooms = useRooms(devices);
  const { isEditMode, toggleEditMode } = useEditMode();

  useDashboardDevicesLoaded({ connected, connecting, setDevicesLoaded });

  useEditModeBeforeUnload(isEditMode);

  const { activeRoom, changeRoom } = useRoomNavigation('All');
  const previousRoomsRef = useRef<string[]>(rooms);
  const { addCard, removeCard, updateCard, getCardsForRoom } = useCustomCards();
  const dialogs = useDashboardDialogs();
  const allCustomCards = getCardsForRoom('All');
  const { cardSizes, updateCardSize } = useCardState(devices);
  const { cardOrders } = useCardOrdering(devices, rooms, allCustomCards);
  const { cardZones, updateCardZone } = useCardZones();
  const { deviceMap } = useDeviceMap(devices);
  const { deviceMap: availableDeviceMap } = useDeviceMap(allDevices);
  const homeLayoutValidIds = useMemo(
    () => [...availableDeviceMap.keys(), ...allCustomCards.map((card) => card.id)],
    [availableDeviceMap, allCustomCards]
  );
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

  useEffect(() => {
    if (activeRoom === 'All' || rooms.includes(activeRoom)) {
      previousRoomsRef.current = rooms;
      return;
    }

    if (rooms.length === 0) {
      // Before HA entities hydrate, `rooms` is empty — do not wipe persisted `currentRoom`.
      if (!hassEntitiesHydrated || !devicesLoaded) {
        return;
      }
      changeRoom('All');
      previousRoomsRef.current = rooms;
      return;
    }

    const previousRooms = previousRoomsRef.current;
    const removedRoomIndex = previousRooms.indexOf(activeRoom);
    const nextRoom =
      (removedRoomIndex >= 0
        ? (previousRooms
            .slice(removedRoomIndex + 1)
            .find((room) => room !== activeRoom && rooms.includes(room)) ??
          previousRooms
            .slice(0, removedRoomIndex)
            .reverse()
            .find((room) => room !== activeRoom && rooms.includes(room)))
        : undefined) ??
      rooms[0] ??
      'All';

    changeRoom(nextRoom);
    previousRoomsRef.current = rooms;
  }, [activeRoom, changeRoom, devicesLoaded, hassEntitiesHydrated, rooms]);
  const resetDashboard = useCallback(() => {
    homeLayoutController.resetLayout();
    useCustomCardsStore.getState().replaceCards([]);
  }, [homeLayoutController]);

  const onboarding = useOnboardingController({ allEntityIds, changeRoom, resetDashboard });

  const customCards = getCardsForRoom(activeRoom);

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
    orderedCardIds,
    rooms,
    setActiveSection,
    updateCardSize,
    updateCardZone,
    // Onboarding
    ...onboarding,
    // Dialogs
    ...dialogs,
  };
}

export type { DashboardController } from './use-dashboard-controller.types';
