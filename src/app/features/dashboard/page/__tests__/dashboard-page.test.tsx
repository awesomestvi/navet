import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useErrorStore } from '@/app/stores';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import type { DashboardController } from '../../hooks/use-dashboard-controller.types';

const { getControllerMock } = vi.hoisted(() => ({
  getControllerMock: vi.fn(),
}));

vi.mock('../../hooks/use-dashboard-controller', () => ({
  useDashboardController: getControllerMock,
}));

vi.mock('../../hooks/use-dashboard-profile-sync', () => ({
  useDashboardProfileSync: vi.fn(),
}));

vi.mock('../../components/dashboard-section-router', () => ({
  DashboardSectionRouter: () => <main>dashboard ready</main>,
}));

vi.mock('../../components/dashboard-overlays', () => ({
  DashboardOverlays: () => null,
}));

vi.mock('../../components/dashboard-arrival-reveal', () => ({
  DashboardArrivalReveal: () => null,
}));

import { DashboardPage } from '../index';

describe('DashboardPage loading recovery', () => {
  beforeEach(async () => {
    await resetAppStores();
    getControllerMock.mockReturnValue(createController());
  });

  afterEach(() => {
    getControllerMock.mockReset();
  });

  it('does not render the loading devices spinner when dashboard loading is blocked', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.queryByText('Loading devices...')).not.toBeInTheDocument();
    expect(useErrorStore.getState().error?.message).toBe('Still loading devices');
  });

  it('sets the global error immediately when dashboard loading is blocked', () => {
    renderWithProviders(<DashboardPage />);

    expect(useErrorStore.getState().error?.message).toBe('Still loading devices');
    expect(useErrorStore.getState().error?.details).toContain(
      'Navet could not finish preparing the dashboard'
    );
  });

  it('does not set an error if the dashboard becomes ready before the grace period', () => {
    const controller = createController();
    getControllerMock.mockReturnValue(controller);
    const { rerender } = renderWithProviders(<DashboardPage />);

    getControllerMock.mockReturnValue({
      ...controller,
      homeLayoutHydrated: true,
    });
    rerender(<DashboardPage />);

    expect(screen.getByText('dashboard ready')).toBeInTheDocument();
  });

  it('keeps the connecting spinner while still connecting', () => {
    getControllerMock.mockReturnValue(createController({ connecting: true }));
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('Connecting to Home Assistant...')).toBeInTheDocument();
    expect(useErrorStore.getState().error).toBeNull();
  });
});

function createController(overrides: Partial<DashboardController> = {}): DashboardController {
  return {
    activeRoom: 'All',
    activeSection: 'home',
    addableEntityIds: [],
    allCustomCards: [],
    allEntityIds: [],
    allViewGrouping: 'custom',
    availableDeviceMap: new Map(),
    cardOrders: new Map(),
    cardSizes: {},
    cardZones: {},
    changeRoom: vi.fn(),
    customCards: [],
    deviceMap: new Map(),
    connecting: false,
    devicesLoaded: true,
    handleAddCard: vi.fn(),
    handleAddLibraryCard: vi.fn(),
    handleAddEntity: vi.fn(),
    handleDeleteCard: vi.fn(),
    handleRemoveEntity: vi.fn(),
    handleUpdateCard: vi.fn(),
    hiddenEntityIds: [],
    homeLayout: {
      mode: 'personal',
      showHero: true,
      cardIds: ['light.missing'],
      sections: [],
      cardSectionAssignments: {},
    },
    homeLayoutHydrated: false,
    addHomeCard: vi.fn(),
    removeHomeCard: vi.fn(),
    moveHomeCard: vi.fn(),
    setHomeLayoutMode: vi.fn(),
    addHomeSection: vi.fn(),
    addHomeColumnSection: vi.fn(),
    addHomeSectionBelow: vi.fn(),
    moveHomeSection: vi.fn(),
    moveHomeColumn: vi.fn(),
    renameHomeSection: vi.fn(),
    removeHomeSection: vi.fn(),
    resizeHomeSection: vi.fn(),
    isEditMode: false,
    lightDeviceMap: new Map(),
    lightRooms: [],
    onToggleEditMode: vi.fn(),
    orderedCardIds: [],
    onSetRoomOrder: vi.fn(),
    onSetAllViewGrouping: vi.fn(),
    roomHiddenItemCounts: new Map(),
    roomItemCounts: new Map(),
    rooms: [],
    setActiveSection: vi.fn(),
    updateCardSize: vi.fn(),
    updateCardZone: vi.fn(),
    showAddCardDialog: false,
    showAddEntityDialog: false,
    showDeviceSettingsDialog: false,
    addCardTargetSectionId: undefined,
    selectedDevice: null,
    selectedCardType: null,
    closeAddCardDialog: vi.fn(),
    closeAddEntityDialog: vi.fn(),
    closeDeviceSettingsDialog: vi.fn(),
    openAddCardDialog: vi.fn(),
    openAddEntityDialog: vi.fn(),
    openDeviceSettingsDialog: vi.fn(),
    dashboardArrivalVariant: null,
    isOnboardingClosing: false,
    isOnboardingOpen: false,
    onCloseOnboarding: vi.fn(),
    onDismissImportedDashboardReveal: vi.fn(),
    onFinishOnboarding: vi.fn(),
    onOpenOnboarding: vi.fn(),
    showImportedDashboardReveal: false,
    ...overrides,
  } as DashboardController;
}
