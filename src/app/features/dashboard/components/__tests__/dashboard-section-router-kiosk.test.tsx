import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_ROOMS_ID } from '@/app/constants/rooms';
import { useSettingsStore } from '@/app/stores';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import type { DashboardController } from '../../hooks/use-dashboard-controller';
import { DashboardSectionRouter } from '../dashboard-section-router';

vi.mock('@/app/components/layout/room-nav', () => ({
  RoomNav: () => <nav data-testid="room-nav">Room nav</nav>,
}));

vi.mock('@/app/features/dashboard/shell', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <section data-testid="dashboard-layout">{children}</section>
  ),
}));

vi.mock('../home-dashboard-overview', () => ({
  HomeDashboardOverview: () => <main>Home dashboard</main>,
}));

describe('DashboardSectionRouter kiosk mode', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('renders RoomNav outside kiosk mode', () => {
    renderWithProviders(<DashboardSectionRouter controller={createController()} />);

    expect(screen.getByText('Home dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('room-nav')).toBeInTheDocument();
  });

  it('omits RoomNav in kiosk mode', () => {
    useSettingsStore.getState().updateSettings({ kioskMode: true });

    renderWithProviders(<DashboardSectionRouter controller={createController()} />);

    expect(screen.getByText('Home dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('room-nav')).not.toBeInTheDocument();
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
