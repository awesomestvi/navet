import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import { I18nProvider } from '@navet/app/i18n';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EnergyDashboardPage } from '../energy-dashboard-page';

function renderDashboardPage(storyId: string) {
  const scenario = getEnergyDashboardScenario(storyId);
  useThemeStore.setState({
    ...useThemeStore.getState(),
    theme: 'dark',
    followSystemTheme: false,
    primaryColor: 'orange',
    customPrimaryColor: null,
    wallpaper: null,
  });

  return render(
    <I18nProvider>
      <EnergyDashboardPage
        dashboard={scenario.dashboard}
        sourceDiagnostics={getMockEnergySourceDiagnostics(scenario.dashboard)}
      />
    </I18nProvider>
  );
}

describe('EnergyDashboardPage', () => {
  it('renders ripple dots from inner to outer rings around the load orb', () => {
    renderDashboardPage('default');

    const dots = screen.getAllByTestId('load-orb-dot');
    expect(dots).toHaveLength(170);
    expect(dots[0]).toHaveAttribute('data-ring', '0');
    expect(dots.at(-1)).toHaveAttribute('data-ring', '4');
  });
});
