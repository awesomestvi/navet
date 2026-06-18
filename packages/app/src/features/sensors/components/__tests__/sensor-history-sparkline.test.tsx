import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SensorHistorySparkline } from '../sensor-history-sparkline';

describe('SensorHistorySparkline', () => {
  it('uses a full-height baseline without extra bottom gap', () => {
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
    const baseline = sparkline.querySelector('line');

    expect(baseline).not.toBeNull();
    expect(baseline?.getAttribute('y1')).toBe('120');
    expect(baseline?.getAttribute('y2')).toBe('120');
  });
});
