import { integrationStore } from '@navet/app/stores/integration-store';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergySection } from '../energy-section';

const energyDashboardMock = vi.hoisted(() => ({
  useEnergyDashboard: vi.fn(),
}));

vi.mock('../../hooks/use-energy-dashboard', () => ({
  useEnergyDashboard: energyDashboardMock.useEnergyDashboard,
}));

vi.mock('../dashboard/energy-dashboard-page', () => ({
  EnergyDashboardPage: () => <div>Energy dashboard ready</div>,
}));

describe('EnergySection', () => {
  beforeEach(() => {
    integrationStore.getState().setCurrentProviderId('home_assistant');
    energyDashboardMock.useEnergyDashboard.mockReturnValue({
      dashboard: { nodes: [] },
      energySourceDiagnostics: [],
      hasEnergyStatisticsLoaded: true,
      isLoading: false,
      isConnected: true,
      isConfigured: true,
    });
  });

  it('keeps showing the loading state while the initial energy snapshot is hydrating', () => {
    energyDashboardMock.useEnergyDashboard.mockReturnValue({
      dashboard: { nodes: [] },
      energySourceDiagnostics: [],
      hasEnergyStatisticsLoaded: false,
      isLoading: true,
      isConnected: true,
      isConfigured: false,
    });

    renderWithProviders(<EnergySection />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Connect to Home Assistant Energy')).not.toBeInTheDocument();
    expect(screen.queryByText('Energy dashboard ready')).not.toBeInTheDocument();
  });

  it('renders the configured empty state once loading has resolved and energy is not set up', () => {
    energyDashboardMock.useEnergyDashboard.mockReturnValue({
      dashboard: { nodes: [] },
      energySourceDiagnostics: [],
      hasEnergyStatisticsLoaded: false,
      isLoading: false,
      isConnected: true,
      isConfigured: false,
    });

    renderWithProviders(<EnergySection />);

    expect(screen.getByText('Connect to Home Assistant Energy')).toBeInTheDocument();
  });
});
