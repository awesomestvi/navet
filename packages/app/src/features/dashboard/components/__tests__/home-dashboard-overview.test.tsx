import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeDashboardOverview } from '../home-dashboard-overview';

vi.mock('@navet/app/hooks', async () => {
  const actual = await vi.importActual<object>('@navet/app/hooks');
  return {
    ...actual,
    useAccentColor: () => '#f97316',
    useI18n: () => ({
      t: (key: string) => key,
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
        temperatureUnit: 'C';
        advancedCustomizationEnabled: boolean;
        customSummaryPills: [];
      }) => unknown
    ) =>
      selector({
        showHomeSummaryBar: true,
        temperatureUnit: 'C',
        advancedCustomizationEnabled: false,
        customSummaryPills: [],
      }),
  };
});

vi.mock('../hooks/use-home-energy-summary', () => ({
  useHomeEnergySummary: () => ({
    gridImportTodayKWh: undefined,
  }),
}));

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

  it('keeps both presentation and edit trees mounted across mode toggles', async () => {
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
    const { rerender } = renderWithProviders(<HomeDashboardOverview {...props} isEditMode />);

    expect(await screen.findByTestId('home-edit')).toBeInTheDocument();
    const presentation = screen.getByTestId('home-presentation');
    expect(presentation).toBeInTheDocument();
    expect(presentation.parentElement).toHaveClass('hidden');
    expect(presentation.parentElement).toHaveAttribute('aria-hidden', 'true');

    rerender(<HomeDashboardOverview {...props} isEditMode={false} />);

    expect(screen.getByTestId('home-presentation')).toBeInTheDocument();
    expect(screen.getByTestId('home-edit')).toBeInTheDocument();
  });
});
