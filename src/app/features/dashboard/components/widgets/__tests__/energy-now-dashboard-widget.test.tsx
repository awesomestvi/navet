import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { EnergyNowDashboardWidget } from '../energy-now-dashboard-widget';

const energyDashboardMock = vi.hoisted(() => ({
  useEnergyDashboard: vi.fn(),
  useEnergyLoadHistory: vi.fn(),
}));

vi.mock('@/app/features/energy', () => ({
  EnergyNowCardView: ({ title }: { title: string }) => <div>{title}</div>,
  useEnergyDashboard: energyDashboardMock.useEnergyDashboard,
  useEnergyLoadHistory: energyDashboardMock.useEnergyLoadHistory,
}));

describe('EnergyNowDashboardWidget', () => {
  beforeEach(() => {
    energyDashboardMock.useEnergyLoadHistory.mockReturnValue([]);
    energyDashboardMock.useEnergyDashboard.mockReturnValue({
      overview: {
        totals: {
          currentLoadW: 420,
          solarTodayKWh: 0,
          solarW: 0,
          importTodayKWh: 0,
          importW: 0,
        },
        topConsumers: [],
      },
      currentLoadStatisticId: 'sensor.home_power',
      todayTotalUsageKWh: 3.2,
      isConnected: true,
      isConfigured: true,
    });
  });

  it('shows an empty state until an energy source is selected', () => {
    renderWithProviders(<EnergyNowDashboardWidget onUpdate={vi.fn()} />);

    expect(screen.getByText('Energy Now')).toBeInTheDocument();
    expect(screen.getAllByText('Energy entities').length).toBeGreaterThan(0);
    expect(screen.queryByText('Energy today')).not.toBeInTheDocument();
  });

  it('opens source settings from the empty state action and saves the selection', () => {
    const onUpdate = vi.fn();

    renderWithProviders(<EnergyNowDashboardWidget onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Energy entities' }));
    fireEvent.click(screen.getByRole('button', { name: /Energy today/i }));

    expect(onUpdate).toHaveBeenCalledWith({ selectedSourceId: 'home-load' });
  });

  it('uses the custom-card empty state when Home Assistant energy is not configured', () => {
    energyDashboardMock.useEnergyDashboard.mockReturnValue({
      overview: {
        totals: {
          currentLoadW: 0,
          solarTodayKWh: 0,
          solarW: 0,
          importTodayKWh: 0,
          importW: 0,
        },
        topConsumers: [],
      },
      currentLoadStatisticId: undefined,
      todayTotalUsageKWh: 0,
      isConnected: true,
      isConfigured: false,
    });

    renderWithProviders(<EnergyNowDashboardWidget onUpdate={vi.fn()} />);

    expect(screen.getByText('Energy Now')).toBeInTheDocument();
    expect(screen.getByText('Connect to Home Assistant Energy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Energy entities' })).toBeInTheDocument();
    expect(screen.queryByText('Current Load')).not.toBeInTheDocument();
  });
});
