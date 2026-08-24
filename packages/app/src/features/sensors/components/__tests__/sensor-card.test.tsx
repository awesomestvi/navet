import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InfoCard } from '../sensor-card';

const { useSensorStatisticsHistoryMock } = vi.hoisted(() => ({
  useSensorStatisticsHistoryMock: vi.fn(),
}));

vi.mock('../../hooks/use-sensor-statistics-history', () => ({
  useSensorStatisticsHistory: useSensorStatisticsHistoryMock,
}));

describe('InfoCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it('preserves dense identity chrome for extra-small sensor cards', () => {
    useSensorStatisticsHistoryMock.mockReturnValue({
      points: [],
      canFetch: false,
      hasHistory: false,
    });

    const { container } = renderWithProviders(
      <InfoCard
        id="sensor.kitchen_temperature"
        name="Kitchen Temperature"
        room="Kitchen"
        value="21.4"
        unit="°C"
        subtitle="temperature"
        deviceClass="temperature"
        size="extra-small"
        onSizeChange={() => undefined}
        isEditMode={false}
      />
    );

    expect(container.querySelector('.navet-card-header-control-dense')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Kitchen Temperature' })).toHaveClass(
      'text-[11px]',
      'leading-[13px]'
    );
    expect(screen.getByText('Temperature')).toHaveClass('text-[10px]', 'leading-[12px]');
  });

  it('uses a radar icon for motion sensors and migrates the legacy person icon', () => {
    useSensorStatisticsHistoryMock.mockReturnValue({
      points: [],
      canFetch: false,
      hasHistory: false,
    });
    localStorage.setItem(
      'navet-sensor-card-icons:binary_sensor.hall_motion',
      JSON.stringify('PersonStanding')
    );

    const { container } = renderWithProviders(
      <InfoCard
        id="binary_sensor.hall_motion"
        name="Hall Motion"
        room="Hall"
        value="Clear"
        unit=""
        subtitle="motion"
        deviceClass="motion"
        status="clear"
        size="small"
        onSizeChange={() => undefined}
        isEditMode={false}
      />
    );

    expect(container.querySelector('.lucide-radar')).not.toBeNull();
    expect(container.querySelector('.lucide-person-standing')).toBeNull();
  });
});
