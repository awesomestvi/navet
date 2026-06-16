import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import type { DashboardController } from '@navet/app/features/dashboard/hooks/use-dashboard-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSectionRouter, shouldSubscribeTaskRoutines } from '../dashboard-section-router';

const roomNavMock = vi.fn();
const dashboardLayoutMock = vi.fn();

vi.mock('@navet/app/components/layout/room-nav', () => ({
  RoomNav: (props: unknown) => {
    roomNavMock(props);
    return <nav data-testid="room-nav">Room nav</nav>;
  },
}));

vi.mock('@navet/app/features/dashboard/shell', () => ({
  DashboardLayout: (props: { children: ReactNode; mobileEditActions?: unknown }) => {
    dashboardLayoutMock(props);
    return <section data-testid="dashboard-layout">{props.children}</section>;
  },
}));

vi.mock('../home-dashboard-overview', () => ({
  HomeDashboardOverview: () => <main>Home dashboard</main>,
}));

describe('DashboardSectionRouter home controls', () => {
  beforeEach(async () => {
    await resetAppStores();
    roomNavMock.mockClear();
    dashboardLayoutMock.mockClear();
  });

  it('hides view grouping and uses add card for all rooms', async () => {
    const controller = createController();
    controller.isEditMode = true;
    controller.addableEntityIds = ['light.kitchen'];

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    const roomNavProps = roomNavMock.mock.calls[0]?.[0] as Record<string, unknown>;
    const layoutProps = dashboardLayoutMock.mock.calls[0]?.[0] as {
      mobileEditActions?: Record<string, unknown>;
    };

    expect(roomNavProps.onAddEntity).toBe(controller.onOpenAddCardDialog);
    expect(roomNavProps.addEntityLabel).toBe('Add Card');
    expect(roomNavProps).not.toHaveProperty('allViewGrouping');
    expect(roomNavProps).not.toHaveProperty('onAllViewGroupingChange');
    expect(layoutProps.mobileEditActions?.onAddEntity).toBe(controller.onOpenAddCardDialog);
    expect(layoutProps.mobileEditActions?.addEntityLabel).toBe('Add Card');
    expect(layoutProps.mobileEditActions).not.toHaveProperty('allViewGrouping');
    expect(layoutProps.mobileEditActions).not.toHaveProperty('onAllViewGroupingChange');
  });

  it('uses add card in edit mode for a room-scoped home view', async () => {
    const controller = createController();
    controller.isEditMode = true;
    controller.activeRoom = 'Kitchen';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    const roomNavProps = roomNavMock.mock.calls[0]?.[0] as Record<string, unknown>;
    const layoutProps = dashboardLayoutMock.mock.calls[0]?.[0] as {
      mobileEditActions?: Record<string, unknown>;
    };

    expect(roomNavProps.onAddEntity).toBe(controller.onOpenAddCardDialog);
    expect(roomNavProps.addEntityLabel).toBe('Add Card');
    expect(layoutProps.mobileEditActions?.onAddEntity).toBe(controller.onOpenAddCardDialog);
    expect(layoutProps.mobileEditActions?.addEntityLabel).toBe('Add Card');
  });
});

describe('shouldSubscribeTaskRoutines', () => {
  it('subscribes only on home and tasks sections', () => {
    expect(shouldSubscribeTaskRoutines('home')).toBe(true);
    expect(shouldSubscribeTaskRoutines('tasks')).toBe(true);
    expect(shouldSubscribeTaskRoutines('lights')).toBe(false);
    expect(shouldSubscribeTaskRoutines('security')).toBe(false);
  });
});

function createController(): DashboardController {
  return {
    activeRoom: ALL_ROOMS_ID,
    activeSection: 'home',
    addableEntityIds: [],
    allCustomCards: [],
    allEntityIds: [],
    allViewGrouping: 'custom',
    availableDeviceMap: new Map(),
    cardOrders: {},
    cardSizes: {},
    cardZones: {},
    changeRoom: vi.fn(),
    closeAddCardDialog: vi.fn(),
    closeAddEntityDialog: vi.fn(),
    closeDeviceSettingsDialog: vi.fn(),
    connecting: false,
    customCards: [],
    dashboardArrivalVariant: null,
    deviceMap: new Map(),
    devicesLoaded: true,
    handleChooseAllEntities: vi.fn(),
    handleChooseBlankDashboard: vi.fn(),
    handleAddCard: vi.fn(),
    handleAddEntity: vi.fn(),
    handleAddLibraryCard: vi.fn(),
    handleImportDashboardConfig: vi.fn(),
    handleOnboardingImportDashboardConfig: vi.fn(),
    handleDeleteCard: vi.fn(),
    handleRemoveEntity: vi.fn(),
    handleUpdateCard: vi.fn(),
    hiddenEntityIds: [],
    hiddenRoomNames: [],
    homeLayout: {
      cardIds: [],
      cardSectionAssignments: {},
      mode: 'personal',
      sections: [],
      showHero: true,
    },
    homeLayoutHydrated: true,
    isEditMode: false,
    isOnboardingClosing: false,
    isOnboardingOpen: false,
    lightDeviceMap: new Map(),
    lightRooms: [],
    onCloseAddCardDialog: vi.fn(),
    onCloseAddEntityDialog: vi.fn(),
    onCloseOnboarding: vi.fn(),
    onCompleteOnboardingClose: vi.fn(),
    onDismissImportedDashboardReveal: vi.fn(),
    onFinishOnboarding: vi.fn(),
    onOpenAddCardDialog: vi.fn(),
    onOpenAddEntityDialog: vi.fn(),
    onOpenDeviceSettingsDialog: vi.fn(),
    onOpenOnboarding: vi.fn(),
    onSetAllViewGrouping: vi.fn(),
    onSetHiddenRoomNames: vi.fn(),
    onSetRoomOrder: vi.fn(),
    onToggleEditMode: vi.fn(),
    onboardingCompleted: true,
    openAddCardDialog: vi.fn(),
    openAddEntityDialog: vi.fn(),
    openDeviceSettingsDialog: vi.fn(),
    orderedCardIds: [],
    removeHomeCard: vi.fn(),
    roomHiddenItemCounts: new Map(),
    roomItemCounts: new Map(),
    rooms: [ALL_ROOMS_ID, 'Kitchen'],
    sectionData: {
      isOverviewSection: true,
      energyCustomCards: [],
      energyOrderedCardIds: [],
      hiddenLightEntityIds: [],
      allLightDeviceMap: new Map(),
      climateDeviceMap: new Map(),
      allClimateDeviceMap: new Map(),
      hiddenClimateEntityIds: [],
      climateSections: [],
    },
    selectedCardType: null,
    selectedDevice: null,
    setActiveSection: vi.fn(),
    updateCardSize: vi.fn(),
    updateCardZone: vi.fn(),
    addCardTargetSectionId: null,
    addHomeCard: vi.fn(),
    addHomeColumnSection: vi.fn(),
    addHomeSection: vi.fn(),
    addHomeSectionBelow: vi.fn(),
    moveHomeCard: vi.fn(),
    moveHomeColumn: vi.fn(),
    moveHomeSection: vi.fn(),
    renameHomeSection: vi.fn(),
    removeHomeSection: vi.fn(),
    resizeHomeSection: vi.fn(),
    setHomeLayoutMode: vi.fn(),
    showAddCardDialog: false,
    showAddEntityDialog: false,
    showDeviceSettingsDialog: false,
    showImportedDashboardReveal: false,
  } as unknown as DashboardController;
}
