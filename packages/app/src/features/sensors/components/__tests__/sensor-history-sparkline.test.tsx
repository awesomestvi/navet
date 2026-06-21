import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SensorHistorySparkline } from '../sensor-history-sparkline';

describe('SensorHistorySparkline', () => {
  it('renders the shared energy sparkline treatment for sensor history', () => {
    renderWithProviders(
      <SensorHistorySparkline
        data={[
          { value: 20.4, timestampMs: 1, endTimestampMs: 2, minValue: 20.1, maxValue: 20.7 },
          { value: 20.8, timestampMs: 2, endTimestampMs: 3, minValue: 20.6, maxValue: 21.0 },
          { value: 21.1, timestampMs: 3, endTimestampMs: 4, minValue: 20.9, maxValue: 21.3 },
        ]}
        accentColor="#10b981"
        height={120}
      />
    );

    const sparkline = screen.getByTestId('sensor-history-sparkline');

    expect(sparkline).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Power sparkline' })).toBeInTheDocument();
  });
});
