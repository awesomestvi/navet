import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import { I18nProvider } from '@navet/app/i18n';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
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
});
