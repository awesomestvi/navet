import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUntrackedTrend, EnergyDashboardPage } from '../energy-dashboard-page';

vi.mock('@navet/app/features/dashboard/components/dashboard-card-item', () => ({
  DashboardCardItem: ({
    card,
    onUpdateCard,
  }: {
    card: { id: string };
    onUpdateCard?: (cardId: string, updates: Record<string, unknown>) => void;
  }) => (
    <div>
      <div>Energy card {card.id}</div>
      <button
        type="button"
        onClick={() =>
          onUpdateCard?.(card.id, {
            data: {
              sensorCategoryFilter: 'energy',
              sensorEntityIds: ['home_assistant:sensor.remaining_electricity'],
            },
          })
        }
      >
        Update energy card
      </button>
    </div>
  ),
}));

function renderDashboardPage(
  storyId: string,
  props: Partial<ComponentProps<typeof EnergyDashboardPage>> = {}
) {
  const scenario = getEnergyDashboardScenario(storyId);

  return renderWithProviders(
    <EnergyDashboardPage
      dashboard={scenario.dashboard}
      sourceDiagnostics={getMockEnergySourceDiagnostics(scenario.dashboard)}
      {...props}
    />
  );
}

describe('EnergyDashboardPage', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
    useThemeStore.setState({
      ...useThemeStore.getState(),
      theme: 'dark',
      followSystemTheme: false,
      primaryColor: 'orange',
      customPrimaryColor: null,
      wallpaper: null,
    });
  });

  it('renders ripple dots from inner to outer rings around the load orb', () => {
    renderDashboardPage('default');

    const dots = screen.getAllByTestId('load-orb-dot');
    expect(dots.length).toBeGreaterThan(0);
    expect(dots[0]).toHaveAttribute('data-ring', '0');
    expect(dots.at(-1)).toHaveAttribute('data-ring', '4');
  });

  it('shows total tracked consumption without imported or generated energy', () => {
    renderDashboardPage('default');

    expect(screen.getByTestId('load-orb-consumption')).toHaveTextContent('48.4 kWh today');
  });

  it('subtracts device histories point-by-point from the whole-home sparkline', () => {
    const scenario = getEnergyDashboardScenario('default');
    const [bathroom, toilet] = scenario.dashboard.topConsumers;
    if (!bathroom || !toilet) {
      throw new Error('Expected at least two demo energy consumers');
    }
    const consumers = [
      { ...bathroom, id: 'bathroom', powerW: 1280 },
      { ...toilet, id: 'toilet', powerW: 750 },
    ];

    const trend = buildUntrackedTrend({
      consumers,
      consumerTrends: {
        bathroom: [
          { label: 'Earlier', value: 1000 },
          { label: 'Now', value: 1280 },
        ],
        toilet: [
          { label: 'Earlier', value: 500 },
          { label: 'Now', value: 750 },
        ],
      },
      wholeHomeCurrentW: 4000,
      wholeHomePoints: [
        { label: 'Earlier', value: 3 },
        { label: 'Now', value: 4 },
      ],
    });

    expect(trend.at(-1)?.value).toBe(1970);
  });

  it('hides untracked when whole-home consumption minus devices is not positive', () => {
    renderDashboardPage('default');

    expect(screen.queryByText('Untracked')).not.toBeInTheDocument();
  });

  it('calculates active and idle device shares from total tracked consumption', () => {
    renderDashboardPage('default');

    expect(screen.getByText('Active · 39% of consumption today')).toBeInTheDocument();
    expect(screen.getByText('Idle · 17% of consumption today')).toBeInTheDocument();
  });

  it('shows zero live power for idle demo devices', () => {
    const scenario = getEnergyDashboardScenario('default');
    const idleConsumers = scenario.dashboard.topConsumers.filter(
      (consumer) => consumer.status === 'idle'
    );

    expect(idleConsumers).not.toHaveLength(0);
    expect(idleConsumers.every((consumer) => consumer.powerW === 0)).toBe(true);
  });

  it('does not include idle devices in the live-load orb', () => {
    renderDashboardPage('default');

    const orbColors = new Set(
      screen.getAllByTestId('load-orb-dot').map((dot) => dot.style.backgroundColor)
    );
    expect(orbColors).not.toContain('rgb(16, 185, 129)');
    expect(orbColors).not.toContain('rgb(244, 63, 94)');
  });

  it('shows untracked consumption in gray when no device has tracked consumption', () => {
    const scenario = getEnergyDashboardScenario('default');
    const dashboard = {
      ...scenario.dashboard,
      topConsumers: scenario.dashboard.topConsumers.map((consumer) => ({
        ...consumer,
        energyKWh: 0,
        powerW: 0,
        status: 'idle' as const,
      })),
    };

    renderDashboardPage('default', { dashboard });

    const dots = screen.getAllByTestId('load-orb-dot');
    expect(dots).not.toHaveLength(0);
    expect(dots.every((dot) => dot.style.backgroundColor === 'rgb(148, 163, 184)')).toBe(true);
    expect(screen.getByText('Untracked', { selector: 'div.truncate' })).toBeInTheDocument();
    expect(screen.getAllByText('Untracked')).toHaveLength(3);
    expect(screen.getByText('Not assigned to a tracked device')).toBeInTheDocument();
    expect(screen.getByTestId('load-orb-consumption')).toHaveTextContent('22.6 kWh today');
    expect(screen.getAllByTestId('energy-now-chart-layer')).toHaveLength(7);
  });

  it('subtracts tracked devices from whole-home consumption to calculate untracked energy', () => {
    const scenario = getEnergyDashboardScenario('default');
    const selectedRange = scenario.dashboard.selectedRange;
    const dashboard = {
      ...scenario.dashboard,
      topConsumers: scenario.dashboard.topConsumers.map((consumer, index) => ({
        ...consumer,
        energyKWh: index < 3 ? 4 : 0,
      })),
      ranges: {
        ...scenario.dashboard.ranges,
        [selectedRange]: {
          ...scenario.dashboard.ranges[selectedRange],
          totalUsageKWh: 20,
        },
      },
    };

    renderDashboardPage('default', { dashboard });

    expect(screen.getAllByText('8.0 kWh')).toHaveLength(2);
    expect(screen.getByTestId('load-orb-consumption')).toHaveTextContent('20.0 kWh today');
  });

  it('promotes the orb and live energy split to lg widths in more-space mode', () => {
    useSettingsStore.getState().updateSettings({ dashboardSpaceMode: 'more_space' });

    renderDashboardPage('default');

    const layout = screen.getByTestId('energy-live-layout');
    expect(layout).toHaveAttribute('data-space-mode', 'more_space');
    expect(layout).toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]');
  });

  it('keeps live energy and its orb side-by-side at xl widths in default mode', () => {
    renderDashboardPage('default');

    const layout = screen.getByTestId('energy-live-layout');
    expect(layout).toHaveAttribute('data-space-mode', 'default');
    expect(layout).toHaveClass('xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]');
  });

  it('defaults to devices and toggles the table content to sources from the pills', () => {
    renderDashboardPage('default');

    expect(screen.getByRole('button', { name: 'Devices' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Device')).toBeInTheDocument();
    expect(screen.queryByTestId('energy-sources-card')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sources' }));

    expect(screen.getByRole('button', { name: 'Sources' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Device')).not.toBeInTheDocument();
    expect(screen.getByTestId('energy-sources-card')).toBeInTheDocument();
    expect(screen.getByText('Grid import')).toBeInTheDocument();
  });

  it('renders live energy explanations from the dashboard model', () => {
    renderDashboardPage('default');

    expect(screen.getByText('Why it looks this way')).toBeInTheDocument();
    expect(screen.getByText(/biggest live driver/)).toBeInTheDocument();
    expect(screen.getByText(/Navet explains the live load/)).toBeInTheDocument();
  });

  it('keeps the sources card on the theme-native shell instead of forcing an accent shell', () => {
    useThemeStore.setState({
      ...useThemeStore.getState(),
      theme: 'dark',
      followSystemTheme: false,
      primaryColor: 'custom',
      customPrimaryColor: '#12abef',
      wallpaper: null,
    });

    renderDashboardPage('default');

    fireEvent.click(screen.getByRole('button', { name: 'Sources' }));

    const sourcesCard = screen.getByTestId('energy-sources-card');
    expect(sourcesCard.className).not.toContain('bg-gradient-to-br');
    expect(sourcesCard.className).not.toContain('from-blue-900/90');
    expect(sourcesCard.className).not.toContain('to-blue-950/95');
    expect(sourcesCard.className).not.toContain('border-blue-700/30');
    expect(sourcesCard.getAttribute('style')).toBeNull();
  });

  it('does not render the energy dashboard hero', () => {
    renderDashboardPage('default');

    expect(screen.queryByText('Energy at a glance.')).not.toBeInTheDocument();
    expect(screen.queryByText('See where power is flowing right now.')).not.toBeInTheDocument();
  });

  it('renders custom energy cards in their own lane', () => {
    renderDashboardPage('default', {
      energyCustomCards: [
        {
          id: 'custom-energy-card',
          type: 'info',
          size: 'medium',
          room: '__energy__',
          createdAt: 1,
          data: {
            sensorEntityIds: ['home_assistant:sensor.remaining_electricity'],
            sensorCategoryFilter: 'energy',
          },
        },
      ],
      energyOrderedCardIds: ['custom-energy-card'],
    });

    expect(screen.getByText('Energy card custom-energy-card')).toBeInTheDocument();
  });

  it('passes custom energy card updates through without nesting the data payload again', () => {
    const onUpdateCard = vi.fn();

    renderDashboardPage('default', {
      energyCustomCards: [
        {
          id: 'custom-energy-card',
          type: 'info',
          size: 'medium',
          room: '__energy__',
          createdAt: 1,
          data: {
            sensorCategoryFilter: 'energy',
          },
        },
      ],
      energyOrderedCardIds: ['custom-energy-card'],
      onUpdateCard,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update energy card' }));

    expect(onUpdateCard).toHaveBeenCalledWith('custom-energy-card', {
      data: {
        sensorCategoryFilter: 'energy',
        sensorEntityIds: ['home_assistant:sensor.remaining_electricity'],
      },
    });
  });
});
