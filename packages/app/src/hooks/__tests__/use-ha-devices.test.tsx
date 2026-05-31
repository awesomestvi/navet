import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { binarySensorEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/binary-sensor';
import {
  fanEntityFactory,
  fanEntityFixtures,
} from '@navet/app/test/fixtures/home-assistant/entities/fan';
import {
  sensorEntityFactory,
  sensorEntityFixtures,
} from '@navet/app/test/fixtures/home-assistant/entities/sensor';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { describe, expect, it } from 'vitest';
import { useHADevices } from '../use-ha-devices';

describe('useHADevices', () => {
  it('maps Home Assistant fan entities as addable fan devices with registry-derived room names', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entities: {
        [fanEntityFixtures.normal.entity_id]: fanEntityFixtures.normal,
      },
      entityRegistry: [{ entity_id: fanEntityFixtures.normal.entity_id, area_id: 'hallway' }],
      areas: [{ area_id: 'hallway', name: 'Hallway' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.fans).toEqual([
      expect.objectContaining({
        id: `home_assistant:${fanEntityFixtures.normal.entity_id}`,
        nativeId: fanEntityFixtures.normal.entity_id,
        canonicalId: `home_assistant:${fanEntityFixtures.normal.entity_id}`,
        providerId: 'home_assistant',
        name: 'Bedroom Fan',
        room: 'Hallway',
        state: true,
        percentage: 66,
      }),
    ]);
    expect(result.current.switches).toEqual([]);
  });

  it('maps sensor and binary_sensor entities from realistic Home Assistant payloads', async () => {
    await resetAppStores();
    const temperatureSensor = sensorEntityFactory();
    const motionSensor = binarySensorEntityFixtures.normal;
    homeAssistantStore.setState({
      entities: {
        [temperatureSensor.entity_id]: temperatureSensor,
        [motionSensor.entity_id]: motionSensor,
      },
      entityRegistry: [
        { entity_id: temperatureSensor.entity_id, area_id: 'kitchen' },
        { entity_id: motionSensor.entity_id, area_id: 'kitchen' },
      ],
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.sensors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `home_assistant:${temperatureSensor.entity_id}`,
          nativeId: temperatureSensor.entity_id,
          canonicalId: `home_assistant:${temperatureSensor.entity_id}`,
          providerId: 'home_assistant',
          name: 'Kitchen Temperature',
          room: 'Kitchen',
          value: '21.4',
          unit: '°C',
          deviceClass: 'temperature',
        }),
        expect.objectContaining({
          id: `home_assistant:${binarySensorEntityFixtures.normal.entity_id}`,
          nativeId: binarySensorEntityFixtures.normal.entity_id,
          canonicalId: `home_assistant:${binarySensorEntityFixtures.normal.entity_id}`,
          providerId: 'home_assistant',
          name: 'Front Door Motion',
          room: 'Kitchen',
          value: 'Detected',
          unit: '',
          deviceClass: 'motion',
        }),
      ])
    );
  });

  it('preserves unavailable and unknown Home Assistant entity states in mapped devices', async () => {
    await resetAppStores();
    const unavailableFan = fanEntityFactory();
    unavailableFan.state = 'unavailable';
    homeAssistantStore.setState({
      entities: {
        [unavailableFan.entity_id]: unavailableFan,
        [sensorEntityFixtures.unknown.entity_id]: sensorEntityFixtures.unknown,
      },
      entityRegistry: [
        { entity_id: unavailableFan.entity_id, area_id: 'office' },
        { entity_id: sensorEntityFixtures.unknown.entity_id, area_id: 'office' },
      ],
      areas: [{ area_id: 'office', name: 'Office' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.fans[0]).toEqual(
      expect.objectContaining({
        id: `home_assistant:${unavailableFan.entity_id}`,
        room: 'Office',
        state: false,
      })
    );
    expect(result.current.sensors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `home_assistant:${sensorEntityFixtures.unknown.entity_id}`,
          room: 'Office',
          value: 'unknown',
        }),
      ])
    );
  });

  it('tolerates missing optional and malformed-but-plausible Home Assistant attributes', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entities: {
        [sensorEntityFixtures.missingOptionalAttributes.entity_id]:
          sensorEntityFixtures.missingOptionalAttributes,
        [fanEntityFixtures.malformedButPlausible.entity_id]:
          fanEntityFixtures.malformedButPlausible,
      },
      entityRegistry: [
        {
          entity_id: sensorEntityFixtures.missingOptionalAttributes.entity_id,
          area_id: 'utility',
        },
        { entity_id: fanEntityFixtures.malformedButPlausible.entity_id, area_id: 'utility' },
      ],
      areas: [{ area_id: 'utility', name: 'Utility' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.sensors[0]).toEqual(
      expect.objectContaining({
        id: `home_assistant:${sensorEntityFixtures.missingOptionalAttributes.entity_id}`,
        room: 'Utility',
      })
    );
    expect(result.current.fans[0]).toEqual(
      expect.objectContaining({
        id: `home_assistant:${fanEntityFixtures.malformedButPlausible.entity_id}`,
        room: 'Utility',
      })
    );
  });
});
