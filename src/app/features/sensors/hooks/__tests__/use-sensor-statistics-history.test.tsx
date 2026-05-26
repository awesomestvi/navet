import { waitFor } from '@testing-library/react';
import type { Connection } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { binarySensorEntityFactory } from '@/test/fixtures/home-assistant/entities/binary-sensor';
import { sensorEntityFactory } from '@/test/fixtures/home-assistant/entities/sensor';
import { renderHookWithProviders } from '@/test/render';
import { useSensorStatisticsHistory } from '../use-sensor-statistics-history';

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

    const temperatureSensor = sensorEntityFactory({
      friendly_name: 'Kitchen Temperature',
      device_class: 'temperature',
      unit_of_measurement: '°C',
    });
    temperatureSensor.entity_id = 'sensor.kitchen_temperature';
    temperatureSensor.state = '21.3';

    vi.spyOn(homeAssistantService, 'getConnection').mockReturnValue(connection);
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      connection,
      entities: {
        'sensor.kitchen_temperature': temperatureSensor,
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

    const motionSensor = binarySensorEntityFactory({
      device_class: 'motion',
    });
    motionSensor.entity_id = 'binary_sensor.hall_motion';
    motionSensor.state = 'on';
    const timestampSensor = sensorEntityFactory({
      device_class: 'timestamp',
    });
    timestampSensor.entity_id = 'sensor.sun_next_setting';
    timestampSensor.state = '2026-05-25T19:29:00.000Z';
    const unavailableTemperature = sensorEntityFactory({
      device_class: 'temperature',
      unit_of_measurement: '°C',
    });
    unavailableTemperature.entity_id = 'sensor.garage_temperature';
    unavailableTemperature.state = 'unavailable';

    vi.spyOn(homeAssistantService, 'getConnection').mockReturnValue(connection);
    homeAssistantStore.setState({
      ...homeAssistantStore.getInitialState(),
      connection,
      entities: {
        'binary_sensor.hall_motion': motionSensor,
        'sensor.sun_next_setting': timestampSensor,
        'sensor.garage_temperature': unavailableTemperature,
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
