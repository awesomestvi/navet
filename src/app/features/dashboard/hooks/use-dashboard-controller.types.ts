import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { useCardState, useDeviceMap } from '@/app/hooks';
import type { Section } from '@/app/navigation/sections';
import type { AllViewGrouping } from '../all-view-grid';
import type { CardType } from '../components/add-card-dialog';
import type { CustomCard } from '../stores/custom-cards-store';
import type { ZoneName } from '../zones/zone-types';
import type { useCardOrdering } from './use-card-ordering';
import type { useCardZones } from './use-card-zones';
import type { useCustomCards } from './use-custom-cards';
import type { DashboardDialogs } from './use-dashboard-dialogs';
import type { useHomeDashboardLayout } from './use-home-dashboard-layout';
import type { OnboardingController } from './use-onboarding-controller';

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
    handleAddLibraryCard: (cardId: string) => void;
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
    moveHomeColumn: ReturnType<typeof useHomeDashboardLayout>['moveColumn'];
    renameHomeSection: ReturnType<typeof useHomeDashboardLayout>['renameSection'];
    removeHomeSection: ReturnType<typeof useHomeDashboardLayout>['removeSection'];
    resizeHomeSection: ReturnType<typeof useHomeDashboardLayout>['resizeSection'];
    isEditMode: boolean;
    lightDeviceMap: ReturnType<typeof useDeviceMap>['deviceMap'];
    lightRooms: string[];
    onToggleEditMode: () => void;
    orderedCardIds: string[];
    onSetRoomOrder: (rooms: string[]) => void;
    onSetAllViewGrouping: (grouping: AllViewGrouping) => void;
    rooms: string[];
    setActiveSection: (section: Section) => void;
    updateCardSize: ReturnType<typeof useCardState>['updateCardSize'];
    updateCardZone: (id: string, zone: ZoneName) => void;
  };
