import { waitFor } from '@testing-library/react';
import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderHookWithProviders } from '@/test/render';
import { useSensorStatisticsHistory } from '../use-sensor-statistics-history';

function entity(
  entityId: string,
  state: string,
  attributes: HassEntity['attributes'] = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    context: { id: 'context', parent_id: null, user_id: null },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
  };
}

describe('useSensorStatisticsHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
    });
  });

  it('returns recorder history for numeric sensors with statistics', async () => {
    const connection = {
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
    } as unknown as Connection;

    vi.spyOn(homeAssistantService, 'getConnection').mockReturnValue(connection);
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      connection,
      entities: {
        'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.3', {
          friendly_name: 'Kitchen Temperature',
          device_class: 'temperature',
          unit_of_measurement: '°C',
        }),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useSensorStatisticsHistory('sensor.kitchen_temperature')
    );

    await waitFor(() => {
      expect(result.current.hasHistory).toBe(true);
    });

    expect(result.current.points).toHaveLength(2);
    expect(connection.sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  it('does not fetch history for binary, timestamp, or unavailable sensors', async () => {
    const connection = {
      sendMessagePromise: vi.fn(),
    } as unknown as Connection;

    vi.spyOn(homeAssistantService, 'getConnection').mockReturnValue(connection);
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      connection,
      entities: {
        'binary_sensor.hall_motion': entity('binary_sensor.hall_motion', 'on', {
          device_class: 'motion',
        }),
        'sensor.sun_next_setting': entity('sensor.sun_next_setting', '2026-05-25T19:29:00.000Z', {
          device_class: 'timestamp',
        }),
        'sensor.garage_temperature': entity('sensor.garage_temperature', 'unavailable', {
          device_class: 'temperature',
          unit_of_measurement: '°C',
        }),
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

    expect(connection.sendMessagePromise).not.toHaveBeenCalled();
  });
});
