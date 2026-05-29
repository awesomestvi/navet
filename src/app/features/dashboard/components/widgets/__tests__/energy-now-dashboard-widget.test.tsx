import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';
import { renderWithProviders } from '@/test/render';
import { EnergyNowDashboardWidget } from '../energy-now-dashboard-widget';

const energyDashboardMock = vi.hoisted(() => ({
  useEnergyLoadHistory: vi.fn(),
  useProviderEnergyNow: vi.fn(),
}));

vi.mock('@/app/features/energy', () => ({
  EnergyNowCardView: ({ title }: { title: string }) => <div>{title}</div>,
  useEnergyLoadHistory: energyDashboardMock.useEnergyLoadHistory,
  useProviderEnergyNow: energyDashboardMock.useProviderEnergyNow,
}));

describe('EnergyNowDashboardWidget', () => {
  beforeEach(() => {
    integrationStore.getState().setCurrentProviderId('home_assistant');
    energyDashboardMock.useEnergyLoadHistory.mockReturnValue([]);
    energyDashboardMock.useProviderEnergyNow.mockReturnValue({
      currentLoadW: 420,
      solarTodayKWh: 0,
      solarW: 0,
      importTodayKWh: 0,
      importW: 0,
      currentLoadStatisticId: 'sensor.home_power',
      todayTotalUsageKWh: 3.2,
      isConnected: true,
      isConfigured: true,
      sourceOptions: [
        {
          id: 'home-load',
          name: 'Home',
          currentPowerW: 420,
          todayUsageKWh: 3.2,
          trendEntityId: 'sensor.home_power',
          group: 'home',
        },
      ],
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
    energyDashboardMock.useProviderEnergyNow.mockReturnValue({
      currentLoadW: 0,
      solarTodayKWh: 0,
      solarW: 0,
      importTodayKWh: 0,
      importW: 0,
      currentLoadStatisticId: undefined,
      todayTotalUsageKWh: 0,
      isConnected: true,
      isConfigured: false,
      sourceOptions: [],
    });

    renderWithProviders(<EnergyNowDashboardWidget onUpdate={vi.fn()} />);

    expect(screen.getByText('Energy Now')).toBeInTheDocument();
    expect(screen.getByText('Connect to Home Assistant Energy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Energy entities' })).toBeInTheDocument();
    expect(screen.queryByText('Current Load')).not.toBeInTheDocument();
  });

  it('uses the card empty state when Home Assistant is disconnected', () => {
    energyDashboardMock.useProviderEnergyNow.mockReturnValue({
      currentLoadW: 0,
      solarTodayKWh: 0,
      solarW: 0,
      importTodayKWh: 0,
      importW: 0,
      currentLoadStatisticId: undefined,
      todayTotalUsageKWh: 0,
      isConnected: false,
      isConfigured: true,
      sourceOptions: [],
    });

    renderWithProviders(<EnergyNowDashboardWidget />);

    expect(screen.getByText('Energy Now')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Navet cannot reach Home Assistant right now. Cached UI is still available while it reconnects.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Energy entities' })).not.toBeInTheDocument();
    expect(screen.queryByText('Current Load')).not.toBeInTheDocument();
  });

  it('shows a provider capability fallback when the active provider does not support energy', () => {
    integrationStore.getState().setCurrentProviderId('homey');

    renderWithProviders(<EnergyNowDashboardWidget />);

    expect(screen.getByText('Energy Now')).toBeInTheDocument();
    expect(screen.getByText('Homey does not support this feature yet.')).toBeInTheDocument();
    expect(screen.queryByText('Current Load')).not.toBeInTheDocument();
  });
});
