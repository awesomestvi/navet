import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeDashboardOverview } from '../home-dashboard-overview';

const overviewMocks = vi.hoisted(() => ({
  choresEnabled: true,
  showHomeSummaryBar: true,
  useHomeEnergySummary: vi.fn(() => ({
    gridImportTodayKWh: undefined,
  })),
}));

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<object>('@navet/app/hooks');
  return {
    ...actual,
    useAccentColor: () => '#f97316',
    useI18n: () => ({
      t: (key: string, values?: Record<string, unknown>) =>
        ({
          'homeSummary.security': 'Security',
          'homeSummary.noAlerts': 'No Alerts',
          'household.tabs.chores': 'Chores',
          'household.rooms.overdue': `${String(values?.count ?? 0)} overdue`,
          'dashboard.summary.openSection': `Open ${String(values?.name ?? '')}`,
        })[key] ?? key,
    }),
    useThemeMode: () => 'glass',
  };
});

vi.mock('@navet/app/stores', async () => {
  const actual = await vi.importActual<object>('@navet/app/stores');
  return {
    ...actual,
    useSettingsStore: (
      selector: (state: {
        showHomeSummaryBar: boolean;
        choresEnabled: boolean;
        temperatureUnit: 'C';
        advancedCustomizationEnabled: boolean;
        customSummaryPills: [];
      }) => unknown
    ) =>
      selector({
        showHomeSummaryBar: overviewMocks.showHomeSummaryBar,
        choresEnabled: overviewMocks.choresEnabled,
        temperatureUnit: 'C',
        advancedCustomizationEnabled: false,
        customSummaryPills: [],
      }),
  };
});

vi.mock('../hooks/use-home-energy-summary', () => ({
  useHomeEnergySummary: overviewMocks.useHomeEnergySummary,
}));

vi.mock('@navet/app/features/chores/use-chore-workspace-sync', () => ({
  useChoreWorkspaceSync: vi.fn(),
}));

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

vi.mock('../home-dashboard-overview-presentation', () => ({
  HomePresentation: () => <div data-testid="home-presentation" />,
}));

vi.mock('../home-dashboard-overview-edit', () => ({
  default: () => <div data-testid="home-edit" />,
}));

vi.mock('../home-dashboard-overview.shared', async () => {
  const actual = await vi.importActual<object>('../home-dashboard-overview.shared');
  return {
    ...actual,
    useHomeLayoutViewport: () => ({
      effectiveCols: 4,
      isPortrait: false,
    }),
    buildHomeOverviewCollections: () => ({
      allCards: new Map(),
      flowCards: [],
      sectionCards: [],
    }),
  };
});

function device(overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>) {
  return {
    name: overrides.id,
    room: 'Living Room',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

describe('HomeDashboardOverview', () => {
  beforeEach(async () => {
    await resetAppStores();
    overviewMocks.showHomeSummaryBar = true;
    overviewMocks.choresEnabled = true;
    overviewMocks.useHomeEnergySummary.mockClear();
  });

  it('builds the home summary bar from the visible summary map instead of hidden raw devices', () => {
    const hiddenAlertDevice = device({
      id: 'binary_sensor.side_door',
      type: 'sensors',
      deviceClass: 'door',
      status: 'unavailable',
      securitySeverity: 'unknown',
      value: 'Unavailable',
      unit: '',
    });
    const visibleSecureDevice = device({
      id: 'lock.front_door',
      type: 'locks',
      state: true,
      securityKind: 'lock',
      securitySeverity: 'normal',
    });

    renderWithProviders(
      <HomeDashboardOverview
        deviceMap={new Map([[hiddenAlertDevice.id, hiddenAlertDevice]])}
        summaryDeviceMap={new Map([[visibleSecureDevice.id, visibleSecureDevice]])}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode={false}
        hiddenEntityCount={1}
        allCustomCards={[]}
        homeLayout={{
          mode: 'flow',
          showHero: true,
          cardIds: [],
          sections: [],
          cardSectionAssignments: {},
        }}
        removeHomeCard={vi.fn()}
        moveHomeCard={vi.fn()}
        setHomeLayoutMode={vi.fn()}
        addHomeSection={vi.fn()}
        addHomeColumnSection={vi.fn()}
        addHomeSectionBelow={vi.fn()}
        moveHomeSection={vi.fn()}
        moveHomeColumn={vi.fn()}
        renameHomeSection={vi.fn()}
        removeHomeSection={vi.fn()}
        resizeHomeSection={vi.fn()}
        onNavigateSection={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Status summary')).toHaveTextContent('No Alerts');
    expect(screen.queryByText('1 Alert')).not.toBeInTheDocument();
  });

  it('navigates an overdue Chores summary to the tasks section', () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({
      data: createChoreDemoWorkspace({ copy: choreCopy }),
    });
    const onNavigateSection = vi.fn();

    renderWithProviders(
      <HomeDashboardOverview
        deviceMap={new Map()}
        summaryDeviceMap={new Map()}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode={false}
        hiddenEntityCount={0}
        allCustomCards={[]}
        homeLayout={{
          mode: 'flow',
          showHero: true,
          cardIds: [],
          sections: [],
          cardSectionAssignments: {},
        }}
        removeHomeCard={vi.fn()}
        moveHomeCard={vi.fn()}
        setHomeLayoutMode={vi.fn()}
        addHomeSection={vi.fn()}
        addHomeColumnSection={vi.fn()}
        addHomeSectionBelow={vi.fn()}
        moveHomeSection={vi.fn()}
        moveHomeColumn={vi.fn()}
        renameHomeSection={vi.fn()}
        removeHomeSection={vi.fn()}
        resizeHomeSection={vi.fn()}
        onNavigateSection={onNavigateSection}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Chores' }));

    expect(onNavigateSection).toHaveBeenCalledWith('tasks');
  });

  it('keeps only the active presentation or edit tree mounted across mode toggles', async () => {
    const props = {
      deviceMap: new Map(),
      summaryDeviceMap: new Map(),
      cardSizes: {},
      updateCardSize: vi.fn(),
      hiddenEntityCount: 0,
      allCustomCards: [],
      homeLayout: {
        mode: 'flow' as const,
        showHero: true,
        cardIds: [],
        sections: [],
        cardSectionAssignments: {},
      },
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
    };
    const { rerender } = renderWithProviders(
      <HomeDashboardOverview {...props} isEditMode={false} />
    );

    expect(screen.getByTestId('home-presentation')).toBeInTheDocument();
    expect(screen.queryByTestId('home-edit')).not.toBeInTheDocument();

    rerender(<HomeDashboardOverview {...props} isEditMode />);

    expect(await screen.findByTestId('home-edit')).toBeInTheDocument();
    expect(screen.queryByTestId('home-presentation')).not.toBeInTheDocument();

    rerender(<HomeDashboardOverview {...props} isEditMode={false} />);

    expect(screen.getByTestId('home-presentation')).toBeInTheDocument();
    expect(screen.queryByTestId('home-edit')).not.toBeInTheDocument();
  });

  it('does not mount Home summary data work when the summary bar is disabled', () => {
    overviewMocks.showHomeSummaryBar = false;

    renderWithProviders(
      <HomeDashboardOverview
        deviceMap={new Map()}
        summaryDeviceMap={new Map()}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode={false}
        hiddenEntityCount={0}
        allCustomCards={[]}
        homeLayout={{
          mode: 'flow',
          showHero: true,
          cardIds: [],
          sections: [],
          cardSectionAssignments: {},
        }}
        removeHomeCard={vi.fn()}
        moveHomeCard={vi.fn()}
        setHomeLayoutMode={vi.fn()}
        addHomeSection={vi.fn()}
        addHomeColumnSection={vi.fn()}
        addHomeSectionBelow={vi.fn()}
        moveHomeSection={vi.fn()}
        moveHomeColumn={vi.fn()}
        renameHomeSection={vi.fn()}
        removeHomeSection={vi.fn()}
        resizeHomeSection={vi.fn()}
        onNavigateSection={vi.fn()}
      />
    );

    expect(overviewMocks.useHomeEnergySummary).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Status summary')).not.toBeInTheDocument();
  });
});
