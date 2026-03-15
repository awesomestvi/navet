import type { DragEndEvent, DragOverEvent, DragStartEvent, useSensors } from '@dnd-kit/core';
import { useCallback, useEffect, useState } from 'react';
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
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';
import { useCardOrdering } from './use-card-ordering';
import { useCustomCards } from './use-custom-cards';
import { useDashboardDerivedState } from './use-dashboard-derived-state';
import { type DashboardDialogs, useDashboardDialogs } from './use-dashboard-dialogs';
import { useDashboardDnd } from './use-dashboard-dnd';
import { type OnboardingController, useOnboardingController } from './use-onboarding-controller';
import { useRoomOrdering } from './use-room-ordering';

export type DashboardController = OnboardingController &
  DashboardDialogs & {
    activeRoom: string;
    activeSection: Section;
    addableEntityIds: string[];
    allEntityIds: string[];
    allViewGrouping: AllViewGrouping;
    availableDeviceMap: ReturnType<typeof useDeviceMap>['deviceMap'];
    cardOrders: ReturnType<typeof useCardOrdering>['cardOrders'];
    cardSizes: ReturnType<typeof useCardState>['cardSizes'];
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
    handleDragEnd: (_event: DragEndEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragStart: (event: DragStartEvent) => void;
    handleRemoveEntity: (entityId: string) => void;
    handleUpdateCard: (cardId: string, data: Record<string, unknown>) => void;
    hiddenEntityIds: string[];
    isEditMode: boolean;
    lightDeviceMap: ReturnType<typeof useDeviceMap>['deviceMap'];
    lightRooms: string[];
    onToggleEditMode: () => void;
    orderedCardIds: string[];
    onMoveRoom: (activeRoom: string, overRoom: string) => void;
    onSetAllViewGrouping: (grouping: AllViewGrouping) => void;
    roomOrder: string[];
    sensors: ReturnType<typeof useSensors>;
    setActiveSection: (section: Section) => void;
    updateCardSize: ReturnType<typeof useCardState>['updateCardSize'];
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

  useEffect(() => {
    if (connected || !connecting) {
      setDevicesLoaded(true);
    }
  }, [connected, connecting]);

  const { activeRoom, changeRoom } = useRoomNavigation('All');
  const { addCard, removeCard, updateCard, getCardsForRoom } = useCustomCards();
  const allCustomCards = getCardsForRoom('All');
  const { isEditMode, toggleEditMode } = useEditMode();
  const { cardSizes, updateCardSize } = useCardState(devices);
  const { cardOrders, moveCard } = useCardOrdering(devices, rooms, allCustomCards);
  const { roomOrder, moveRoom } = useRoomOrdering(rooms);
  const { deviceMap } = useDeviceMap(devices);
  const { deviceMap: availableDeviceMap } = useDeviceMap(allDevices);
  const {
    addableEntityIds,
    allEntityIds,
    getCardRoom,
    lightDeviceMap,
    lightRooms,
    orderedCardIds,
  } = useDashboardDerivedState({
    activeRoom,
    allCustomCards,
    availableDeviceMap,
    cardOrders,
    deviceMap,
    hiddenEntityIds,
    roomOrder,
  });
  const { activeCardOrders, handleDragEnd, handleDragOver, handleDragStart, sensors } =
    useDashboardDnd({
      cardOrders,
      getCardRoom,
      moveCard,
    });

  const dialogs = useDashboardDialogs();
  const onboarding = useOnboardingController({ allEntityIds, changeRoom });

  const customCards = getCardsForRoom(activeRoom);

  const handleAddCard = useCallback(
    (type: CardType, size: CardSize) => {
      addCard(type, size, activeRoom);
      toast.success(t('dashboard.feedback.widgetAdded', { type, room: activeRoom }));
    },
    [activeRoom, addCard, t]
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
    (cardId: string, data: Record<string, unknown>) => {
      updateCard(cardId, { data });
    },
    [updateCard]
  );

  return {
    activeRoom,
    activeSection,
    addableEntityIds,
    allEntityIds,
    allViewGrouping,
    availableDeviceMap,
    cardOrders: activeCardOrders,
    cardSizes,
    changeRoom,
    customCards,
    deviceMap,
    connecting,
    devicesLoaded,
    handleAddCard,
    handleAddEntity,
    handleDeleteCard,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleRemoveEntity,
    handleUpdateCard,
    hiddenEntityIds,
    isEditMode,
    lightDeviceMap,
    lightRooms,
    onMoveRoom: moveRoom,
    onSetAllViewGrouping: setAllViewGrouping,
    onToggleEditMode: toggleEditMode,
    orderedCardIds,
    roomOrder,
    sensors,
    setActiveSection,
    updateCardSize,
    // Onboarding
    ...onboarding,
    // Dialogs
    ...dialogs,
  };
}
