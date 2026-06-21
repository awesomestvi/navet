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
import { EnergyDashboardPage } from '../energy-dashboard-page';

vi.mock('@navet/app/features/dashboard/components/dashboard-card-item', () => ({
  DashboardCardItem: ({ card }: { card: { id: string } }) => <div>Energy card {card.id}</div>,
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

  it('promotes the orb and live energy split to lg widths in more-space mode', () => {
    useSettingsStore.getState().updateSettings({ dashboardSpaceMode: 'more_space' });

    renderDashboardPage('default');

    const layout = screen.getByTestId('energy-live-layout');
    expect(layout).toHaveAttribute('data-space-mode', 'more_space');
    expect(layout).toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]');
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

  it('renders the shared customize button in the hero and toggles edit mode', () => {
    const onToggleEditMode = vi.fn();
    renderDashboardPage('default', { onToggleEditMode });

    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));

    expect(onToggleEditMode).toHaveBeenCalledTimes(1);
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

  it('opens the energy add card dialog from the hero in edit mode', () => {
    renderDashboardPage('default', {
      isEditMode: true,
      onAddCard: vi.fn(),
    });

    expect(screen.queryByText('No energy cards yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Card' })[0] as HTMLButtonElement);

    expect(screen.getByRole('dialog', { name: 'Add Card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom card' })).toBeInTheDocument();
  });
});
