import { describe, expect, it } from 'vitest';
import { mapHomeAssistantEntitiesToNavetEntities } from './homeassistant-mappers';

function makeEntity(entity_id: string, state: string, attributes: Record<string, unknown>) {
  return {
    entity_id,
    state,
    attributes,
    last_changed: '2026-06-01T10:00:00.000Z',
    last_updated: '2026-06-01T10:00:00.000Z',
    context: { id: 'ctx-1', parent_id: null, user_id: null },
  };
}

describe('homeassistant-mappers', () => {
  it('humanizes generic Home Assistant entity type labels', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'light.kitchen': makeEntity('light.kitchen', 'on', {
          friendly_name: 'Kitchen Light',
        }),
        'media_player.living_room_tv': makeEntity('media_player.living_room_tv', 'idle', {
          friendly_name: 'Living Room TV',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'light.kitchen')?.attributes).toEqual(
      expect.objectContaining({
        entityType: 'Light',
      })
    );

    expect(
      entities.find((entity) => entity.externalId === 'media_player.living_room_tv')?.attributes
    ).toEqual(
      expect.objectContaining({
        entityType: 'Media Player',
      })
    );
  });

  it('uses Home Assistant registry user names when friendly_name is missing', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'media_player.furdoszoba': makeEntity('media_player.furdoszoba', 'idle', {}),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        {
          entity_id: 'media_player.furdoszoba',
          name: null,
          original_name: 'Bathroom speaker',
        },
      ],
    });

    expect(entities.find((entity) => entity.externalId === 'media_player.furdoszoba')).toEqual(
      expect.objectContaining({
        name: 'Bathroom speaker',
        attributes: expect.objectContaining({
          title: 'Bathroom speaker',
        }),
      })
    );
  });

  it('attaches related energy metrics to switch entities from the same device', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'switch.garden_lights_switch': makeEntity('switch.garden_lights_switch', 'off', {
          friendly_name: 'Garden Lights',
        }),
        'sensor.garden_mains_total_energy': makeEntity(
          'sensor.garden_mains_total_energy',
          '0.092',
          {
            friendly_name: 'Garden Mains Total energy',
            device_class: 'energy',
            state_class: 'total_increasing',
            unit_of_measurement: 'kWh',
          }
        ),
        'sensor.garden_mains_power': makeEntity('sensor.garden_mains_power', '127', {
          friendly_name: 'Garden Mains Power',
          device_class: 'power',
          state_class: 'measurement',
          unit_of_measurement: 'W',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        { entity_id: 'switch.garden_lights_switch', device_id: 'device-garden-mains' },
        { entity_id: 'sensor.garden_mains_total_energy', device_id: 'device-garden-mains' },
        { entity_id: 'sensor.garden_mains_power', device_id: 'device-garden-mains' },
      ],
    });

    expect(
      entities.find((entity) => entity.externalId === 'switch.garden_lights_switch')?.attributes
    ).toEqual(
      expect.objectContaining({
        power: 127,
        energy: 0.092,
        metrics: expect.arrayContaining([
          expect.objectContaining({ label: 'Power', value: 127, unit: 'W' }),
          expect.objectContaining({ label: 'Energy', value: 0.092, unit: 'kWh' }),
        ]),
      })
    );
  });

  it('attaches source-device metrics to the owning switch entity', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'switch.washer_outlet': makeEntity('switch.washer_outlet', 'on', {
          friendly_name: 'Washer Outlet',
        }),
        'sensor.washer_total_energy': makeEntity('sensor.washer_total_energy', '4.2', {
          friendly_name: 'Washer Total energy',
          device_class: 'energy',
          unit_of_measurement: 'kWh',
          source_device_id: 'device-washer-outlet',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        { entity_id: 'switch.washer_outlet', device_id: 'device-washer-outlet' },
        { entity_id: 'sensor.washer_total_energy', device_id: 'device-energy-proxy' },
      ],
    });

    expect(
      entities.find((entity) => entity.externalId === 'switch.washer_outlet')?.attributes
    ).toEqual(
      expect.objectContaining({
        energy: 4.2,
        metrics: [expect.objectContaining({ label: 'Energy', value: 4.2, unit: 'kWh' })],
      })
    );
  });

  it('attaches current metrics to switch entities', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'switch.server_rack': makeEntity('switch.server_rack', 'on', {
          friendly_name: 'Server Rack',
        }),
        'sensor.server_rack_current': makeEntity('sensor.server_rack_current', '0.43', {
          friendly_name: 'Server Rack Current',
          device_class: 'current',
          unit_of_measurement: 'A',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        { entity_id: 'switch.server_rack', device_id: 'device-server-rack' },
        { entity_id: 'sensor.server_rack_current', device_id: 'device-server-rack' },
      ],
    });

    expect(
      entities.find((entity) => entity.externalId === 'switch.server_rack')?.attributes
    ).toEqual(
      expect.objectContaining({
        metrics: [expect.objectContaining({ label: 'Current', value: 0.43, unit: 'A' })],
      })
    );
  });

  it('attaches generic Home Assistant numeric metrics to switch entities', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'switch.grow_tent': makeEntity('switch.grow_tent', 'on', {
          friendly_name: 'Grow Tent',
        }),
        'sensor.grow_tent_humidity': makeEntity('sensor.grow_tent_humidity', '47.2', {
          friendly_name: 'Grow Tent Humidity',
          device_class: 'humidity',
          unit_of_measurement: '%',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        { entity_id: 'switch.grow_tent', device_id: 'device-grow-tent' },
        { entity_id: 'sensor.grow_tent_humidity', device_id: 'device-grow-tent' },
      ],
    });

    expect(entities.find((entity) => entity.externalId === 'switch.grow_tent')?.attributes).toEqual(
      expect.objectContaining({
        metrics: [expect.objectContaining({ label: 'Grow Tent Humidity', value: 47.2, unit: '%' })],
      })
    );
  });

  it('prefers entity_picture_local for camera resources and mapped camera state', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'camera.driveway': makeEntity('camera.driveway', 'streaming', {
          friendly_name: 'Driveway',
          entity_picture: '/api/camera_proxy/camera.driveway',
          entity_picture_local: '/api/camera_proxy/camera.driveway_local',
          supported_features: 2,
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'camera.driveway')).toEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          entityPicture: '/api/camera_proxy/camera.driveway_local',
        }),
        resources: expect.objectContaining({
          camera_snapshot: expect.objectContaining({
            path: '/api/camera_proxy/camera.driveway_local',
          }),
        }),
      })
    );
  });
});
