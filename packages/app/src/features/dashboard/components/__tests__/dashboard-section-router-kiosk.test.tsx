import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import type { DashboardController } from '@navet/app/features/dashboard/hooks/use-dashboard-controller';
import { useSettingsStore } from '@navet/app/stores';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSectionRouter } from '../dashboard-section-router';

let allViewGridRenderCount = 0;

vi.mock('@navet/app/components/layout/room-nav', () => ({
  RoomNav: () => <nav data-testid="room-nav">Room nav</nav>,
}));

vi.mock('@navet/app/features/dashboard/shell', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <section data-testid="dashboard-layout">{children}</section>
  ),
}));

vi.mock('../home-dashboard-overview', () => ({
  HomeDashboardOverview: () => <main>Home dashboard</main>,
}));

vi.mock('@navet/app/features/dashboard/all-view-grid', () => ({
  AllViewGrid: () => {
    allViewGridRenderCount += 1;
    return <div>All view grid</div>;
  },
}));

describe('DashboardSectionRouter kiosk mode', () => {
  beforeEach(async () => {
    await resetAppStores();
    allViewGridRenderCount = 0;
  });

  it('renders RoomNav outside kiosk mode', async () => {
    renderWithProviders(<DashboardSectionRouter controller={createController()} />);

    expect(await screen.findByText('Home dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('room-nav')).toBeInTheDocument();
  });

  it('omits RoomNav in kiosk mode', async () => {
    useSettingsStore.getState().updateSettings({ kioskMode: true });

    renderWithProviders(<DashboardSectionRouter controller={createController()} />);

    expect(await screen.findByText('Home dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('room-nav')).not.toBeInTheDocument();
  });

  it('renders the climate dashboard route', () => {
    const controller = createController();
    controller.activeSection = 'climate';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(screen.getByText('No Climate Devices')).toBeInTheDocument();
    expect(screen.queryByTestId('room-nav')).not.toBeInTheDocument();
  });

  it('groups climate dashboard cards by type', () => {
    const controller = createController();
    const livingRoomClimate = createDevice({
      id: 'climate.living_room',
      name: 'Living Room Thermostat',
      room: 'Living Room',
      type: 'climate',
    });
    const kitchenHumidity = createDevice({
      id: 'sensor.kitchen_humidity',
      name: 'Kitchen Humidity',
      room: 'Kitchen',
      type: 'sensors',
      deviceClass: 'humidity',
      value: '43',
      unit: '%',
    });

    controller.activeSection = 'climate';
    controller.deviceMap = new Map([
      [livingRoomClimate.id, livingRoomClimate],
      [kitchenHumidity.id, kitchenHumidity],
    ]);
    controller.availableDeviceMap = controller.deviceMap;
    controller.sectionData = {
      ...controller.sectionData,
      climateDeviceMap: controller.deviceMap,
      allClimateDeviceMap: controller.deviceMap,
      climateSections: [
        {
          key: 'hvac',
          titleKey: 'sections.climate.hvac.title',
          orderedIds: [livingRoomClimate.id],
        },
        {
          key: 'humidity',
          titleKey: 'sections.climate.humidity.title',
          orderedIds: [kitchenHumidity.id],
        },
      ],
    };
    controller.cardOrders = {
      'Living Room': [livingRoomClimate.id],
      Kitchen: [kitchenHumidity.id],
    };
    controller.rooms = [ALL_ROOMS_ID, 'Living Room', 'Kitchen'];

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(screen.getByRole('heading', { name: 'Thermostats & HVAC' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Humidity' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Living Room' })).not.toBeInTheDocument();
  });

  it('does not rerender the lights section for unrelated home-layout controller churn', () => {
    const controller = createController();
    const light = createDevice({
      id: 'light.kitchen',
      name: 'Kitchen Light',
      room: 'Kitchen',
      type: 'lights',
    });

    controller.activeSection = 'lights';
    controller.lightDeviceMap = new Map([[light.id, light]]);
    controller.lightRooms = ['Kitchen'];
    controller.availableDeviceMap = new Map([[light.id, light]]);
    controller.sectionData = {
      ...controller.sectionData,
      allLightDeviceMap: controller.availableDeviceMap,
    };
    controller.cardOrders = { Kitchen: [light.id] };

    const { rerender } = renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(allViewGridRenderCount).toBe(1);

    const nextController = {
      ...controller,
      homeLayout: {
        ...controller.homeLayout,
        cardIds: ['custom-home-card'],
      },
      allCustomCards: [
        {
          id: 'custom-home-card',
          room: 'home',
          type: 'note',
          size: 'medium',
          title: 'Home note',
          createdAt: 1,
        } as DashboardController['allCustomCards'][number],
      ],
    };

    rerender(<DashboardSectionRouter controller={nextController} />);

    expect(allViewGridRenderCount).toBe(1);
  });
});

function createDevice(overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>) {
  return {
    name: overrides.id,
    room: 'Living Room',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

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
