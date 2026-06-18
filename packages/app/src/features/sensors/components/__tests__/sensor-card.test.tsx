import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InfoCard } from '../sensor-card';

const { useSensorStatisticsHistoryMock } = vi.hoisted(() => ({
  useSensorStatisticsHistoryMock: vi.fn(),
}));

vi.mock('../../hooks/use-sensor-statistics-history', () => ({
  useSensorStatisticsHistory: useSensorStatisticsHistoryMock,
}));

describe('InfoCard', () => {
  it('shows a sparkline by default when the entity supports history', () => {
    useSensorStatisticsHistoryMock.mockReturnValue({
      points: [
        { value: 20.8, timestampMs: 1, endTimestampMs: 2, minValue: 20.1, maxValue: 21.1 },
        { value: 21.4, timestampMs: 2, endTimestampMs: 3, minValue: 21.1, maxValue: 21.6 },
      ],
      canFetch: true,
      hasHistory: true,
    });

    renderWithProviders(
      <InfoCard
        id="sensor.kitchen_temperature"
        name="Kitchen Temperature"
        room="Kitchen"
        value="21.4"
        unit="°C"
        subtitle="temperature"
        deviceClass="temperature"
        size="medium"
        onSizeChange={() => undefined}
        isEditMode={false}
      />
    );

    expect(screen.getByTestId('sensor-history-sparkline')).toBeInTheDocument();
  });

  it('does not show a sparkline on compact sizes even when history exists', () => {
    useSensorStatisticsHistoryMock.mockReturnValue({
      points: [
        { value: 20.8, timestampMs: 1, endTimestampMs: 2, minValue: 20.1, maxValue: 21.1 },
        { value: 21.4, timestampMs: 2, endTimestampMs: 3, minValue: 21.1, maxValue: 21.6 },
      ],
      canFetch: true,
      hasHistory: true,
    });

    renderWithProviders(
      <InfoCard
        id="sensor.kitchen_temperature"
        name="Kitchen Temperature"
        room="Kitchen"
        value="21.4"
        unit="°C"
        subtitle="temperature"
        deviceClass="temperature"
        size="small"
        onSizeChange={() => undefined}
        isEditMode={false}
      />
    );

    expect(screen.queryByTestId('sensor-history-sparkline')).not.toBeInTheDocument();
  });
});
