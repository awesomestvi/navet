import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { CardSize } from '@/app/components/shared/card-size-selector';
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
import type { Section } from '@/app/navigation/sections';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { AllViewGrouping } from '../all-view-grid';
import type { CardType } from '../components/add-card-dialog';
import type { CustomCard } from '../stores/custom-cards-store';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';
import type { ZoneName } from '../zones/zone-types';
import { useCardOrdering } from './use-card-ordering';
import { useCardZones } from './use-card-zones';
import { HOME_WIDGET_ROOM, useCustomCards } from './use-custom-cards';
import { useDashboardDerivedState } from './use-dashboard-derived-state';
import { type DashboardDialogs, useDashboardDialogs } from './use-dashboard-dialogs';
import { useHomeDashboardLayout } from './use-home-dashboard-layout';
import { type OnboardingController, useOnboardingController } from './use-onboarding-controller';
export type DashboardController = OnboardingController &
  DashboardDialogs & {
    activeRoom: string;
    activeSection: Section;
    addableEntityIds: string[];
    allCustomCards: ReturnType<typeof useCustomCards>['getCardsForRoom'] extends (
      room: string
    ) => infer T
      ? T
      : never;
    allEntityIds: string[];
    allViewGrouping: AllViewGrouping;
    availableDeviceMap: ReturnType<typeof useDeviceMap>['deviceMap'];
    cardOrders: ReturnType<typeof useCardOrdering>['cardOrders'];
    cardSizes: ReturnType<typeof useCardState>['cardSizes'];
    cardZones: ReturnType<typeof useCardZones>['cardZones'];
    changeRoom: (room: string) => void;
    customCards: ReturnType<typeof useCustomCards>['getCardsForRoom'] extends (
      room: string
    ) => infer T
      ? T
      : never;
    deviceMap: ReturnType<typeof useDeviceMap>['deviceMap'];
    connecting: boolean;
    devicesLoaded: boolean;
    handleAddCard: (type: CardType, size: CardSize) => void;
    handleAddEntity: (entityId: string) => void;
    handleDeleteCard: (cardId: string) => void;
    handleRemoveEntity: (entityId: string) => void;
    handleUpdateCard: (
      cardId: string,
      updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>
    ) => void;
    hiddenEntityIds: string[];
    homeLayout: ReturnType<typeof useHomeDashboardLayout>['layout'];
    homeLayoutHydrated: boolean;
    addHomeCard: ReturnType<typeof useHomeDashboardLayout>['addCard'];
    removeHomeCard: ReturnType<typeof useHomeDashboardLayout>['removeCard'];
    moveHomeCard: ReturnType<typeof useHomeDashboardLayout>['moveCard'];
    setHomeLayoutMode: ReturnType<typeof useHomeDashboardLayout>['setMode'];
    addHomeSection: ReturnType<typeof useHomeDashboardLayout>['addSection'];
    addHomeColumnSection: ReturnType<typeof useHomeDashboardLayout>['addColumnSection'];
    addHomeSectionBelow: ReturnType<typeof useHomeDashboardLayout>['addSectionBelow'];
    moveHomeSection: ReturnType<typeof useHomeDashboardLayout>['moveSection'];
    renameHomeSection: ReturnType<typeof useHomeDashboardLayout>['renameSection'];
    removeHomeSection: ReturnType<typeof useHomeDashboardLayout>['removeSection'];
    resizeHomeSection: ReturnType<typeof useHomeDashboardLayout>['resizeSection'];
    isEditMode: boolean;
    lightDeviceMap: ReturnType<typeof useDeviceMap>['deviceMap'];
    lightRooms: string[];
    onToggleEditMode: () => void;
    orderedCardIds: string[];
    onSetAllViewGrouping: (grouping: AllViewGrouping) => void;
    rooms: string[];
    setActiveSection: (section: Section) => void;
    updateCardSize: ReturnType<typeof useCardState>['updateCardSize'];
    updateCardZone: (id: string, zone: ZoneName) => void;
  };

export function useDashboardController(): DashboardController {
  const { activeSection, setActiveSection } = useNavigation();
  const { t } = useI18n();
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [allViewGrouping, setAllViewGrouping] = usePersistedState<AllViewGrouping>(
    STORAGE_KEYS.allViewGrouping,
    'custom'
  );

  const hiddenEntityIds = useDashboardEntitiesStore((state) => state.hiddenEntityIds);
  const hideAutoEntity = useDashboardEntitiesStore((state) => state.hideEntity);
  const showAutoEntity = useDashboardEntitiesStore((state) => state.showEntity);

  const allDevices = useDevices();
  const devices = useDashboardDevices(allDevices, hiddenEntityIds);
  const rooms = useRooms(devices);
  const { isEditMode, toggleEditMode } = useEditMode();

  useEffect(() => {
    if (connected || !connecting) {
      setDevicesLoaded(true);
    }
  }, [connected, connecting]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditMode]);

  const { activeRoom, changeRoom } = useRoomNavigation('All');
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
  const homeLayoutHydrated = useMemo(() => {
    if (homeLayoutController.layout.cardIds.length === 0) {
      return true;
    }

    // Use availableDeviceMap (all HA entities, unfiltered by hidden state) so that a blank
    // dashboard with all entities hidden does not block hydration indefinitely.
    const availableIdSet = new Set([
      ...availableDeviceMap.keys(),
      ...allCustomCards.map((card) => card.id),
    ]);
    if (availableIdSet.size === 0) {
      return true;
    }

    return homeLayoutController.layout.cardIds.every((cardId) => availableIdSet.has(cardId));
  }, [homeLayoutController.layout.cardIds, availableDeviceMap, allCustomCards]);
  const { addableEntityIds, allEntityIds, lightDeviceMap, lightRooms, orderedCardIds } =
    useDashboardDerivedState({
      activeRoom,
      availableDeviceMap,
      cardOrders,
      deviceMap,
      hiddenEntityIds,
      rooms,
    });
  const onboarding = useOnboardingController({ allEntityIds, changeRoom });

  const customCards = getCardsForRoom(activeRoom);

  const handleAddCard = useCallback(
    (type: CardType, size: CardSize) => {
      const isHomeCanvasTarget = activeSection === 'home' && activeRoom === 'All' && isEditMode;
      const newCard = addCard(type, size, isHomeCanvasTarget ? HOME_WIDGET_ROOM : activeRoom);
      const targetRoomLabel = isHomeCanvasTarget ? t('dashboard.roomNav.all') : activeRoom;

      if (isHomeCanvasTarget) {
        if (homeLayoutController.layout.mode !== 'sectioned') {
          homeLayoutController.addCard(newCard.id);
        } else {
          const targetSectionId =
            (dialogs.addCardTargetSectionId &&
              homeLayoutController.layout.sections.some(
                (section) => section.id === dialogs.addCardTargetSectionId
              ) &&
              dialogs.addCardTargetSectionId) ||
            homeLayoutController.layout.sections[0]?.id ||
            homeLayoutController.addSection();

          homeLayoutController.addCard(newCard.id, targetSectionId);
        }
      }

      toast.success(t('dashboard.feedback.widgetAdded', { type, room: targetRoomLabel }));
    },
    [
      activeRoom,
      activeSection,
      addCard,
      dialogs.addCardTargetSectionId,
      homeLayoutController,
      isEditMode,
      t,
    ]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      removeCard(cardId);
      toast.success(t('dashboard.feedback.widgetDeleted'));
    },
    [removeCard, t]
  );

  const handleAddEntity = useCallback(
    (entityId: string) => {
      showAutoEntity(entityId);
      toast.success(t('dashboard.feedback.entityAdded'));
    },
    [showAutoEntity, t]
  );

  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      hideAutoEntity(entityId);
      toast.success(t('dashboard.feedback.entityRemoved'));
    },
    [hideAutoEntity, t]
  );

  const handleUpdateCard = useCallback(
    (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => {
      updateCard(cardId, updates);
    },
    [updateCard]
  );

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
