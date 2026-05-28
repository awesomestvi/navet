import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationHistoryService } from '@/app/services/integration-history.service';
import { renderHookWithProviders } from '@/test/render';
import { useSensorStatisticsHistory } from '../use-sensor-statistics-history';

const { useProviderEntitySnapshotMock } = vi.hoisted(() => ({
  useProviderEntitySnapshotMock: vi.fn(),
}));

vi.mock('@/app/hooks', () => ({
  useProviderEntitySnapshot: useProviderEntitySnapshotMock,
}));

describe('useSensorStatisticsHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useProviderEntitySnapshotMock.mockReset();
  });

  it('returns recorder history for numeric sensors with statistics', async () => {
    const messageClient = {
      sendMessagePromise: vi.fn().mockResolvedValue({
        'sensor.kitchen_temperature': [
          {
            start: '2026-05-25T10:00:00.000Z',
            end: '2026-05-25T10:05:00.000Z',
            mean: 20.9,
            min: 20.4,
            max: 21.2,
          },
          {
            start: '2026-05-25T10:05:00.000Z',
            end: '2026-05-25T10:10:00.000Z',
            mean: 21.3,
            min: 21,
            max: 21.5,
          },
        ],
      }),
    };

    useProviderEntitySnapshotMock.mockReturnValue({
      entityId: 'sensor.kitchen_temperature',
      state: '21.3',
      attributes: {
        friendly_name: 'Kitchen Temperature',
        device_class: 'temperature',
        unit_of_measurement: '°C',
      },
    });
    vi.spyOn(integrationHistoryService, 'getMessageClient').mockReturnValue(messageClient);

    const { result } = renderHookWithProviders(() =>
      useSensorStatisticsHistory('sensor.kitchen_temperature')
    );

    await waitFor(() => {
      expect(result.current.hasHistory).toBe(true);
    });

    expect(result.current.points).toHaveLength(2);
    expect(messageClient.sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  it('does not fetch history for binary, timestamp, or unavailable sensors', async () => {
    const messageClient = {
      sendMessagePromise: vi.fn(),
    };

    vi.spyOn(integrationHistoryService, 'getMessageClient').mockReturnValue(messageClient);

    useProviderEntitySnapshotMock
      .mockReturnValueOnce({
        entityId: 'binary_sensor.hall_motion',
        state: 'on',
        attributes: { device_class: 'motion' },
      })
      .mockReturnValueOnce({
        entityId: 'sensor.sun_next_setting',
        state: '2026-05-25T19:29:00.000Z',
        attributes: { device_class: 'timestamp' },
      })
      .mockReturnValueOnce({
        entityId: 'sensor.garage_temperature',
        state: 'unavailable',
        attributes: {
          device_class: 'temperature',
          unit_of_measurement: '°C',
        },
      });

    const motion = renderHookWithProviders(() =>
      useSensorStatisticsHistory('binary_sensor.hall_motion')
    );
    const timestamp = renderHookWithProviders(() =>
      useSensorStatisticsHistory('sensor.sun_next_setting')
    );
    const unavailable = renderHookWithProviders(() =>
      useSensorStatisticsHistory('sensor.garage_temperature')
    );

    await waitFor(() => {
      expect(motion.result.current.canFetch).toBe(false);
      expect(timestamp.result.current.canFetch).toBe(false);
      expect(unavailable.result.current.canFetch).toBe(false);
    });

    expect(messageClient.sendMessagePromise).not.toHaveBeenCalled();
  });

  it('does not query Home Assistant history for non-HA provider-scoped sensors', async () => {
    const messageClient = {
      sendMessagePromise: vi.fn(),
    };

    useProviderEntitySnapshotMock.mockReturnValue({
      entityId: 'sensor.office_temperature',
      state: '20.1',
      attributes: {
        device_class: 'temperature',
        unit_of_measurement: '°C',
      },
    });
    vi.spyOn(integrationHistoryService, 'getMessageClient').mockReturnValue(messageClient);

    const { result } = renderHookWithProviders(() =>
      useSensorStatisticsHistory('homey:sensor.office_temperature')
    );

    await waitFor(() => {
      expect(result.current.canFetch).toBe(false);
      expect(result.current.points).toEqual([]);
    });

    expect(messageClient.sendMessagePromise).not.toHaveBeenCalled();
  });
});
