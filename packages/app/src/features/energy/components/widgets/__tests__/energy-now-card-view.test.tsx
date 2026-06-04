import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EnergyNowCardView } from '../energy-now-card-view';

const baseProps = {
  title: 'Energy today',
  subtitle: 'Widget',
  currentLoadW: 2679,
  todayUsageKWh: 0.2,
  accentColor: '#f97316',
};

describe('EnergyNowCardView', () => {
  it('centers the empty sparkline state within the full card body', () => {
    renderWithProviders(<EnergyNowCardView {...baseProps} trend={[]} size="medium" />);

    const chartLayer = screen.getByTestId('energy-now-chart-layer');
    const emptyState = screen.getByTestId('energy-now-empty-state');

    expect(chartLayer.className).toContain('absolute inset-0');
    expect(chartLayer.className).toContain('items-center');
    expect(emptyState).toHaveTextContent('Not enough data to show sparkline yet.');
  });

  it('renders sparkline data as a full-bleed background layer', () => {
    renderWithProviders(
      <EnergyNowCardView
        {...baseProps}
        size="medium"
        trend={[
          { value: 1900, label: '08:00', timestampMs: Date.now() - 180_000 },
          { value: 2679, label: '08:05', timestampMs: Date.now() - 120_000 },
          { value: 2330, label: '08:10', timestampMs: Date.now() - 60_000 },
          { value: 2480, label: '08:15', timestampMs: Date.now() },
        ]}
      />
    );

    const chartLayer = screen.getByTestId('energy-now-chart-layer');

    expect(chartLayer.className).toContain('absolute inset-x-0');
    expect(chartLayer.className).toContain('top-20');
    expect(screen.getByRole('img', { name: 'Power sparkline' })).toBeInTheDocument();
  });
});
