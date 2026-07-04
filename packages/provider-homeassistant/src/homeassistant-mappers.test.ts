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

  it('ignores blank media player friendly_name values and falls back to the registry name', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'media_player.living_room_tv': makeEntity('media_player.living_room_tv', 'idle', {
          friendly_name: '   ',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        {
          entity_id: 'media_player.living_room_tv',
          name: null,
          original_name: 'Living Room TV',
        },
      ],
    });

    expect(entities.find((entity) => entity.externalId === 'media_player.living_room_tv')).toEqual(
      expect.objectContaining({
        name: 'Living Room TV',
        attributes: expect.objectContaining({
          title: 'Living Room TV',
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

  it('attaches displayable config metrics to switch entities from the same device', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'switch.kitchen_outlet': makeEntity('switch.kitchen_outlet', 'on', {
          friendly_name: 'Kitchen outlet',
        }),
        'select.kitchen_outlet_mode': makeEntity('select.kitchen_outlet_mode', 'eco', {
          friendly_name: 'Outlet mode',
          options: ['eco', 'comfort'],
        }),
        'number.kitchen_outlet_delay': makeEntity('number.kitchen_outlet_delay', '12', {
          friendly_name: 'Outlet delay',
          unit_of_measurement: 's',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        { entity_id: 'switch.kitchen_outlet', device_id: 'device-kitchen-outlet' },
        {
          entity_id: 'select.kitchen_outlet_mode',
          device_id: 'device-kitchen-outlet',
          entity_category: 'config',
        },
        {
          entity_id: 'number.kitchen_outlet_delay',
          device_id: 'device-kitchen-outlet',
          entity_category: 'config',
        },
      ],
    });

    expect(entities.map((entity) => entity.externalId)).toEqual(['switch.kitchen_outlet']);
    expect(
      entities.find((entity) => entity.externalId === 'switch.kitchen_outlet')?.attributes
    ).toEqual(
      expect.objectContaining({
        metrics: expect.arrayContaining([
          expect.objectContaining({
            label: 'Outlet mode',
            value: 'eco',
            unit: '',
            category: 'configuration',
          }),
          expect.objectContaining({
            label: 'Outlet delay',
            value: 12,
            unit: 's',
            category: 'configuration',
          }),
        ]),
      })
    );
  });

  it('hides placeholder config metrics from switch entities', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'switch.pax_calima_boostmode': makeEntity('switch.pax_calima_boostmode', 'on', {
          friendly_name: 'Pax Calima BoostMode',
        }),
        'select.pax_calima_power_on_behaviour': makeEntity(
          'select.pax_calima_power_on_behaviour',
          'PreviousValue',
          {
            friendly_name: 'Pax Calima Power-on behaviour',
            options: ['PreviousValue', 'On', 'Off'],
          }
        ),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [
        { entity_id: 'switch.pax_calima_boostmode', device_id: 'device-pax-calima' },
        {
          entity_id: 'select.pax_calima_power_on_behaviour',
          device_id: 'device-pax-calima',
          entity_category: 'config',
        },
      ],
    });

    expect(
      entities.find((entity) => entity.externalId === 'switch.pax_calima_boostmode')?.attributes
    ).toEqual(
      expect.not.objectContaining({
        metrics: expect.anything(),
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
          securityKind: 'camera',
          securitySeverity: 'active',
        }),
        resources: expect.objectContaining({
          camera_snapshot: expect.objectContaining({
            path: '/api/camera_proxy/camera.driveway_local',
          }),
        }),
      })
    );
  });

  it('prefers entity_picture_local for media artwork resources and mapped media state', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'media_player.living_homepods_ma_group': makeEntity(
          'media_player.living_homepods_ma_group',
          'playing',
          {
            friendly_name: 'HomePods Airplay Gruppe',
            entity_picture: 'http://music-assistant.local:8095/imageproxy/cover?size=512',
            entity_picture_local:
              '/api/media_player_proxy/media_player.living_homepods_ma_group?token=proxy',
            media_image_url: 'https://cdn.example.test/album.jpg',
            media_title: 'Sunshine (My Girl)',
            media_artist: 'Wuki',
            supported_features: 65281,
          }
        ),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(
      entities.find((entity) => entity.externalId === 'media_player.living_homepods_ma_group')
    ).toEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          entityPicture:
            '/api/media_player_proxy/media_player.living_homepods_ma_group?token=proxy',
        }),
        resources: expect.objectContaining({
          media_artwork: expect.objectContaining({
            path: '/api/media_player_proxy/media_player.living_homepods_ma_group?token=proxy',
          }),
        }),
      })
    );
  });

  it('normalizes powered Home Assistant TVs as idle instead of off', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'media_player.living_room_tv': makeEntity('media_player.living_room_tv', 'on', {
          friendly_name: 'Living Room TV',
          device_class: 'tv',
          source: 'HDMI 1',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'media_player.living_room_tv')).toEqual(
      expect.objectContaining({
        primaryState: 'idle',
        attributes: expect.objectContaining({
          value: 'idle',
          source: 'HDMI 1',
        }),
      })
    );
  });

  it('marks climate entities that only expose a target setpoint without current temperature', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'climate.living_room': makeEntity('climate.living_room', 'heat', {
          friendly_name: 'Living Room Thermostat',
          temperature: 15,
          temperature_unit: '°C',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'climate.living_room')).toEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          currentTemperature: 15,
          hasCurrentTemperature: false,
          temperature: 15,
          temperatureUnit: 'celsius',
        }),
      })
    );
  });

  it('attaches normalized alarm metadata to alarm control panel entities', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'alarm_control_panel.home': makeEntity('alarm_control_panel.home', 'armed_home', {
          friendly_name: 'Home Alarm',
          supported_features: 1 | 2 | 8,
          code_format: 'number',
          code_arm_required: true,
          changed_by: 'Hall Keypad',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'alarm_control_panel.home')).toEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          alarmState: 'armed_home',
          alarmSupportedActions: ['arm_home', 'arm_away', 'disarm', 'trigger'],
          alarmCodeFormat: 'number',
          alarmRequiresCode: true,
          alarmChangedBy: 'Hall Keypad',
          size: 'large',
        }),
      })
    );
  });

  it('maps Home Assistant security entities into existing Navet types with security metadata', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'alarm_control_panel.home': makeEntity('alarm_control_panel.home', 'triggered', {
          friendly_name: 'Home Alarm',
        }),
        'siren.entry': makeEntity('siren.entry', 'off', {
          friendly_name: 'Entry Siren',
        }),
        'device_tracker.phone_alex': makeEntity('device_tracker.phone_alex', 'not_home', {
          friendly_name: 'Alex Phone',
          latitude: 59.3293,
          longitude: 18.0686,
        }),
        'event.front_doorbell': makeEntity('event.front_doorbell', 'doorbell_press', {
          friendly_name: 'Front Doorbell',
          event_type: 'doorbell_press',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'alarm_control_panel.home')).toEqual(
      expect.objectContaining({
        type: 'sensor',
        attributes: expect.objectContaining({
          securityKind: 'alarm',
          securitySeverity: 'critical',
          status: 'active',
          value: 'Triggered',
        }),
      })
    );
    expect(entities.find((entity) => entity.externalId === 'siren.entry')).toEqual(
      expect.objectContaining({
        type: 'sensor',
        attributes: expect.objectContaining({
          securityKind: 'siren',
          securitySeverity: 'normal',
          value: 'Off',
        }),
      })
    );
    expect(entities.find((entity) => entity.externalId === 'device_tracker.phone_alex')).toEqual(
      expect.objectContaining({
        type: 'person',
        attributes: expect.objectContaining({
          securityKind: 'deviceTracker',
          securitySeverity: 'normal',
          location: 'Away',
          latitude: 59.3293,
          longitude: 18.0686,
        }),
      })
    );
    expect(entities.find((entity) => entity.externalId === 'event.front_doorbell')).toEqual(
      expect.objectContaining({
        type: 'sensor',
        attributes: expect.objectContaining({
          securityKind: 'event',
          securitySeverity: 'normal',
          entityType: 'Event',
        }),
      })
    );
  });

  it('does not attach security metadata to generic WAN or router health sensors', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'binary_sensor.wan_status': makeEntity('binary_sensor.wan_status', 'on', {
          friendly_name: 'WAN Status',
          device_class: 'connectivity',
        }),
        'binary_sensor.router_problem': makeEntity('binary_sensor.router_problem', 'on', {
          friendly_name: 'Router Problem',
          device_class: 'problem',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities.find((entity) => entity.externalId === 'binary_sensor.wan_status')).toEqual(
      expect.objectContaining({
        type: 'sensor',
        attributes: expect.not.objectContaining({
          securityKind: expect.anything(),
          securitySeverity: expect.anything(),
        }),
      })
    );
    expect(entities.find((entity) => entity.externalId === 'binary_sensor.router_problem')).toEqual(
      expect.objectContaining({
        type: 'sensor',
        attributes: expect.not.objectContaining({
          securityKind: expect.anything(),
          securitySeverity: expect.anything(),
        }),
      })
    );
  });

  it('keeps grouped security member metadata on binary sensors', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'binary_sensor.any_window_open': makeEntity('binary_sensor.any_window_open', 'on', {
          friendly_name: 'Any Window Open',
          device_class: 'opening',
          entity_id: ['binary_sensor.window_left', 'binary_sensor.window_right'],
          group_members: ['binary_sensor.window_left'],
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(
      entities.find((entity) => entity.externalId === 'binary_sensor.any_window_open')
    ).toEqual(
      expect.objectContaining({
        type: 'sensor',
        attributes: expect.objectContaining({
          securityKind: 'opening',
          groupMembers: ['binary_sensor.window_left', 'binary_sensor.window_right'],
        }),
      })
    );
  });

  it('uses the parent device name when a security opening sensor only exposes a generic label', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'binary_sensor.front_patio_opening': makeEntity(
          'binary_sensor.front_patio_opening',
          'off',
          {
            friendly_name: 'Opening',
            device_class: 'opening',
          }
        ),
      },
      areas: [],
      deviceRegistry: [
        {
          id: 'device-front-patio-door',
          name: 'Front Patio Door',
        },
      ],
      entityRegistry: [
        {
          entity_id: 'binary_sensor.front_patio_opening',
          device_id: 'device-front-patio-door',
        },
      ],
    });

    expect(
      entities.find((entity) => entity.externalId === 'binary_sensor.front_patio_opening')
    ).toEqual(
      expect.objectContaining({
        name: 'Front Patio Door',
        attributes: expect.objectContaining({
          entityType: 'Opening',
          securityKind: 'opening',
        }),
      })
    );
  });

  it('keeps non-security events out of the mapped entity set', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'event.feedreader_news': makeEntity('event.feedreader_news', '2026-06-01T10:00:00.000Z', {
          event_type: 'feedreader',
          link: 'https://example.com/story',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities).toEqual([]);
  });

  it('maps humidifier entities as controllable humidity devices', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'humidifier.basement': makeEntity('humidifier.basement', 'on', {
          friendly_name: 'Basement Dehumidifier',
          device_class: 'dehumidifier',
          current_humidity: 58,
          humidity: 46,
          min_humidity: 35,
          max_humidity: 70,
          target_humidity_step: 5,
          mode: 'auto',
          available_modes: ['auto', 'sleep'],
          action: 'drying',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities).toEqual([
      expect.objectContaining({
        externalId: 'humidifier.basement',
        type: 'switch',
        capabilities: ['toggle'],
        attributes: expect.objectContaining({
          currentHumidity: 58,
          targetHumidity: 46,
          minHumidity: 35,
          maxHumidity: 70,
          targetHumidityStep: 5,
          mode: 'auto',
          availableModes: ['auto', 'sleep'],
          action: 'drying',
          entityType: 'Dehumidifier',
          serviceDomain: 'humidifier',
          value: 'on',
        }),
      }),
    ]);
  });

  it('maps Home Assistant vacuum area metadata from entity-registry area mapping', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'vacuum.roborock': makeEntity('vacuum.roborock', 'idle', {
          friendly_name: 'Roborock',
          supported_features: 4 | 16 | 32 | 512 | 1024 | 8192 | 16384,
          cleaned_area_today: 0,
          clean_time: 0,
        }),
      },
      areas: [
        { area_id: 'area_kitchen', name: 'Kitchen' },
        { area_id: 'area_hallway', name: 'Hallway' },
      ],
      deviceRegistry: [],
      entityRegistry: [
        {
          entity_id: 'vacuum.roborock',
          options: {
            vacuum: {
              area_mapping: {
                area_kitchen: ['0_16'],
                area_hallway: ['0_17'],
              },
              last_seen_segments: [
                { id: '0_16', name: 'Kitchen' },
                { id: '0_17', name: 'Hallway' },
              ],
            },
          },
        },
      ],
    });

    expect(entities).toEqual([
      expect.objectContaining({
        externalId: 'vacuum.roborock',
        attributes: expect.objectContaining({
          supportedFeatures: 4 | 16 | 32 | 512 | 1024 | 8192 | 16384,
          cleanedArea: '0.0 m²',
          cleaningTime: '0 min',
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [
            { id: 'area_kitchen', label: 'Kitchen' },
            { id: 'area_hallway', label: 'Hallway' },
          ],
        }),
      }),
    ]);
  });

  it('prefers the Home Assistant vacuum state over a stale status attribute', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'vacuum.roborock': makeEntity('vacuum.roborock', 'cleaning', {
          friendly_name: 'Roborock',
          status: 'idle',
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities).toEqual([
      expect.objectContaining({
        externalId: 'vacuum.roborock',
        attributes: expect.objectContaining({
          status: 'cleaning',
        }),
      }),
    ]);
  });

  it('prefers a sleeping status attribute when the Home Assistant vacuum state is docked', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'vacuum.roborock': makeEntity('vacuum.roborock', 'docked', {
          friendly_name: 'Roborock',
          status: 'sleeping',
          battery_level: 100,
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities).toEqual([
      expect.objectContaining({
        externalId: 'vacuum.roborock',
        attributes: expect.objectContaining({
          status: 'idle',
        }),
      }),
    ]);
  });

  it('keeps Home Assistant area cleaning hidden when no mapped areas are configured', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'vacuum.roborock': makeEntity('vacuum.roborock', 'idle', {
          friendly_name: 'Roborock',
          supported_features: 8192 | 16384,
        }),
      },
      areas: [{ area_id: 'area_kitchen', name: 'Kitchen' }],
      deviceRegistry: [],
      entityRegistry: [
        {
          entity_id: 'vacuum.roborock',
          options: {
            vacuum: {
              area_mapping: {},
            },
          },
        },
      ],
    });

    expect(entities).toEqual([
      expect.objectContaining({
        externalId: 'vacuum.roborock',
        attributes: expect.objectContaining({
          canCleanByArea: false,
          canOrderAreaCleaning: false,
          availableCleaningAreas: undefined,
        }),
      }),
    ]);
  });

  it('maps lawn mower entities into the vacuum card model without vacuum-only extras', () => {
    const entities = mapHomeAssistantEntitiesToNavetEntities({
      entities: {
        'lawn_mower.backyard': makeEntity('lawn_mower.backyard', 'mowing', {
          friendly_name: 'Backyard Mower',
          battery_level: 84,
          supported_features: 1 | 2 | 4,
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
    });

    expect(entities).toEqual([
      expect.objectContaining({
        externalId: 'lawn_mower.backyard',
        type: 'vacuum',
        attributes: expect.objectContaining({
          value: 'mowing',
          status: 'cleaning',
          battery: 84,
          supportedFeatures: 1 | 2 | 4,
        }),
      }),
    ]);
    expect(entities[0]?.attributes).not.toEqual(
      expect.objectContaining({
        fanSpeed: expect.anything(),
        fanSpeedList: expect.anything(),
        availableCleaningAreas: expect.anything(),
        canCleanByArea: expect.anything(),
        cleanedArea: expect.anything(),
        cleaningTime: expect.anything(),
        waterLevel: expect.anything(),
        binLevel: expect.anything(),
      })
    );
  });
});
