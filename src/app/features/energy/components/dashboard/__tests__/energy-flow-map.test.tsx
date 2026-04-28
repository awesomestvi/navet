import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/app/i18n';
import { useThemeStore } from '@/app/stores/theme-store';
import { getEnergyDashboardScenario } from '../../../data/mock-energy-dashboard';
import { EnergyFlowMap } from '../energy-flow-map';

function renderFlowMap(storyId: string, staticBeams = false) {
  const scenario = getEnergyDashboardScenario(storyId).dashboard;
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
      <EnergyFlowMap
        nodes={scenario.nodes}
        flows={scenario.flows}
        consumers={scenario.topConsumers}
        selectedNodeId="home"
        onNodeSelect={() => {}}
        staticBeams={staticBeams}
      />
    </I18nProvider>
  );
}

describe('EnergyFlowMap', () => {
  it('renders export flow from home to grid', () => {
    const { container } = renderFlowMap('exporting-grid');
    expect(screen.getByLabelText('Energy flow map')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="beam-home-grid"]')).not.toBeNull();
  });

  it('renders downstream home-to-consumer beams', () => {
    const { container } = renderFlowMap('default');
    expect(container.querySelector('[data-testid="beam-consumer-hvac"]')).not.toBeNull();
  });

  it('renders static beams without animate nodes in fallback mode', () => {
    const { container } = renderFlowMap('default', true);
    expect(container.querySelector('animate')).toBeNull();
    expect(container.querySelector('[data-animated="false"]')).not.toBeNull();
  });
});
