import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import type { DashboardController } from '@navet/app/features/dashboard/hooks/use-dashboard-controller';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSectionRouter, shouldSubscribeTaskRoutines } from '../dashboard-section-router';

const roomNavMock = vi.fn();
const dashboardLayoutMock = vi.fn();
const deviceGridPropsMock = vi.fn();
let deviceGridMountCount = 0;

const choreCopy = {
  dishwasher: 'Unload dishwasher',
  toys: 'Toys back home',
  hallway: 'Shoes and jackets',
  laundry: 'Fold clean laundry',
  plants: 'Water the plants',
  bins: 'Take out recycling',
  missionTitle: 'Saturday reset',
  missionDescription: 'Reset the shared spaces.',
  upcomingMissionTitle: 'Evening tidy up',
  upcomingMissionDescription: 'A quick reset before bedtime.',
  rewardTitle: 'Choose a family outing',
  secondRewardTitle: 'Build a new LEGO set',
  childDishwasher: 'Dishwasher rescue',
  childToys: 'Toys back to base',
  childHallway: 'Clear the launch pad',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  hallwayRoom: 'Hallway',
  livingRoom: 'Living room',
};

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

vi.mock('@navet/app/features/chores/components/household-section', () => ({
  HouseholdSection: () => <main>Household dashboard</main>,
}));

vi.mock('@navet/app/features/tasks/components/tasks-section', () => ({
  TasksSection: () => <main>Tasks dashboard</main>,
}));

vi.mock('../../device-grid', () => ({
  DeviceGrid: (props: unknown) => {
    deviceGridPropsMock(props);
    useEffect(() => {
      deviceGridMountCount += 1;
    }, []);

    return <main>Room grid</main>;
  },
}));

describe('DashboardSectionRouter home controls', () => {
  beforeEach(async () => {
    await resetAppStores();
    roomNavMock.mockClear();
    dashboardLayoutMock.mockClear();
    deviceGridPropsMock.mockClear();
    deviceGridMountCount = 0;
  });

  it('suppresses duplicated edit actions for the all-rooms command bar', async () => {
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
    expect(roomNavProps.suppressEditActions).toBe(true);
    expect(roomNavProps).not.toHaveProperty('allViewGrouping');
    expect(roomNavProps).not.toHaveProperty('onAllViewGroupingChange');
    expect(layoutProps.mobileEditActions).toBeUndefined();
  });

  it('suppresses duplicated edit actions for a room-scoped home view', async () => {
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
    expect(roomNavProps.suppressEditActions).toBe(true);
    expect(layoutProps.mobileEditActions).toBeUndefined();
  });

  it('remounts the room grid when changing rooms', async () => {
    const controller = createController();
    controller.activeRoom = 'Kitchen';

    const { rerender } = renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(deviceGridMountCount).toBe(1);

    rerender(
      <DashboardSectionRouter
        controller={{
          ...controller,
          activeRoom: 'Living Room',
          rooms: [ALL_ROOMS_ID, 'Kitchen', 'Living Room'],
        }}
      />
    );

    expect(deviceGridMountCount).toBe(2);
  });

  it('passes the offscreen paint signal to room grids', () => {
    const controller = createController();
    controller.activeRoom = 'Kitchen';
    controller.optimizeOffscreenPaint = true;

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(deviceGridPropsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      isEditMode: false,
      optimizeOffscreenPaint: true,
    });
  });

  it('adds pending chores to their room grid', () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: createChoreDemoWorkspace({ copy: choreCopy }),
    });
    const controller = createController();
    controller.activeRoom = 'Kitchen';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(deviceGridPropsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      supplementalCards: [
        expect.objectContaining({ id: 'room-chore-today-dishwasher', size: 'medium' }),
      ],
    });
    expect(screen.getByText(/1 overdue/)).toBeInTheDocument();
  });

  it('hides room chore summaries and cards when chores are disabled', () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: createChoreDemoWorkspace({ copy: choreCopy }),
    });
    useSettingsStore.getState().updateSettings({ choresEnabled: false });
    const controller = createController();
    controller.activeRoom = 'Kitchen';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(deviceGridPropsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      supplementalCards: [],
    });
    expect(screen.queryByText(/1 remaining/)).not.toBeInTheDocument();
  });

  it('keeps the tasks workspace available when chores are disabled', async () => {
    useSettingsStore.getState().updateSettings({ choresEnabled: false });
    const controller = createController();
    controller.activeSection = 'tasks';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(await screen.findByText('Tasks dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Household dashboard')).not.toBeInTheDocument();
  });

  it('does not expose dashboard customize actions in the household workspace', async () => {
    const controller = createController();
    controller.activeSection = 'tasks';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    expect(await screen.findByText('Household dashboard')).toBeInTheDocument();
    const layoutProps = dashboardLayoutMock.mock.calls[0]?.[0] as {
      mobileEditActions?: Record<string, unknown>;
    };
    expect(layoutProps.mobileEditActions).toBeUndefined();
  });

  it('rerenders when independently consumed controller inputs change', async () => {
    const controller = createController();
    const { rerender } = renderWithProviders(<DashboardSectionRouter controller={controller} />);

    await screen.findByText('Home dashboard');
    dashboardLayoutMock.mockClear();

    let nextController = {
      ...controller,
      handleAddEntity: vi.fn(),
    };
    rerender(<DashboardSectionRouter controller={nextController} />);
    expect(dashboardLayoutMock).toHaveBeenCalled();
    dashboardLayoutMock.mockClear();

    nextController = {
      ...nextController,
      lightDeviceMap: new Map(),
    };
    rerender(<DashboardSectionRouter controller={nextController} />);
    expect(dashboardLayoutMock).toHaveBeenCalled();
    dashboardLayoutMock.mockClear();

    nextController = {
      ...nextController,
      lightRooms: ['Kitchen'],
    };
    rerender(<DashboardSectionRouter controller={nextController} />);
    expect(dashboardLayoutMock).toHaveBeenCalled();
    dashboardLayoutMock.mockClear();

    nextController = {
      ...nextController,
      securityAlertCount: 1,
      activeRoomSecurityAlertCount: 1,
    };
    rerender(<DashboardSectionRouter controller={nextController} />);
    expect(dashboardLayoutMock).toHaveBeenCalled();
  });

  it('passes the offscreen paint signal to climate grids', async () => {
    const controller = createController();
    const climateDevice = {
      id: 'climate.living_room',
      name: 'Living Room Thermostat',
      room: 'Living Room',
      size: 'small',
      temperature: 21,
      currentTemperature: 20,
      mode: 'heat',
      type: 'climate',
    } satisfies DeviceWithType;
    controller.activeSection = 'climate';
    controller.optimizeOffscreenPaint = true;
    controller.sectionData = {
      ...controller.sectionData,
      climateDeviceMap: new Map([[climateDevice.id, climateDevice]]),
      climateSections: [
        {
          key: 'climate',
          titleKey: 'sections.climate.title',
          orderedIds: [climateDevice.id],
        },
      ],
    };

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    await waitFor(() =>
      expect(deviceGridPropsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        isEditMode: false,
        optimizeOffscreenPaint: true,
      })
    );
  });

  it('suppresses duplicated edit actions for the energy dashboard header controls', async () => {
    const controller = createController();
    controller.isEditMode = true;
    controller.activeSection = 'energy';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    const layoutProps = dashboardLayoutMock.mock.calls[0]?.[0] as {
      mobileEditActions?: Record<string, unknown>;
    };

    expect(layoutProps.mobileEditActions).toBeUndefined();
    expect(screen.getByRole('button', { name: 'KPIs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Layout' })).toBeInTheDocument();
  });

  it('suppresses duplicated edit actions for security without manage rooms', async () => {
    const controller = createController();
    controller.isEditMode = true;
    controller.activeSection = 'security';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    const layoutProps = dashboardLayoutMock.mock.calls[0]?.[0] as {
      mobileEditActions?: Record<string, unknown>;
    };

    expect(layoutProps.mobileEditActions).toBeUndefined();
  });

  it('does not expose manage rooms outside the home dashboard', async () => {
    const controller = createController();
    controller.isEditMode = true;
    controller.activeSection = 'lights';

    renderWithProviders(<DashboardSectionRouter controller={controller} />);

    const layoutProps = dashboardLayoutMock.mock.calls[0]?.[0] as {
      mobileEditActions?: Record<string, unknown>;
    };

    expect(layoutProps.mobileEditActions).toBeUndefined();
  });
});

describe('shouldSubscribeTaskRoutines', () => {
  it('subscribes on sections that surface routines or quick scenes', () => {
    expect(shouldSubscribeTaskRoutines('home', true)).toBe(true);
    expect(shouldSubscribeTaskRoutines('home', false)).toBe(false);
    expect(shouldSubscribeTaskRoutines('tasks', true)).toBe(false);
    expect(shouldSubscribeTaskRoutines('lights', false)).toBe(true);
    expect(shouldSubscribeTaskRoutines('security', true)).toBe(false);
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
    canRedoHomeLayout: false,
    canUndoHomeLayout: false,
    changeRoom: vi.fn(),
    closeAddCardDialog: vi.fn(),
    closeAddEntityDialog: vi.fn(),
    closeDeviceSettingsDialog: vi.fn(),
    connecting: false,
    customCards: [],
    dashboardArrivalVariant: null,
    deviceMap: new Map(),
    densePerformanceMode: false,
    denseVisibleCardCount: 0,
    dashboardRooms: [ALL_ROOMS_ID, 'Kitchen'],
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
    optimizeOffscreenPaint: false,
    removeHomeCard: vi.fn(),
    redoHomeLayout: vi.fn(),
    roomHiddenItemCounts: new Map(),
    roomItemCounts: new Map(),
    rooms: [ALL_ROOMS_ID, 'Kitchen'],
    securityAlertCount: 0,
    activeRoomSecurityAlertCount: 0,
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
    undoHomeLayout: vi.fn(),
    showAddCardDialog: false,
    showAddEntityDialog: false,
    showDeviceSettingsDialog: false,
    showImportedDashboardReveal: false,
  } as unknown as DashboardController;
}
