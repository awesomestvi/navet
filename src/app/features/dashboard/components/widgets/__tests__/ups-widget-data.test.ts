import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { buildUpsDeviceOptions, getUpsStatusTone } from '../ups-widget-data';

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

describe('ups widget data', () => {
  it('groups sibling documented NUT sensors by device id and ranks defaults', () => {
    const entities: HassEntities = {
      'sensor.nutdev1_battery_charge': entity('sensor.nutdev1_battery_charge', '97', {
        friendly_name: 'Battery charge',
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_load': entity('sensor.nutdev1_load', '14', {
        friendly_name: 'Load',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_status': entity('sensor.nutdev1_status', 'Online', {
        friendly_name: 'Status',
      }),
      'sensor.nutdev1_status_data': entity('sensor.nutdev1_status_data', 'OL', {
        friendly_name: 'Status data',
      }),
      'sensor.nutdev1_input_voltage': entity('sensor.nutdev1_input_voltage', '232', {
        friendly_name: 'Input voltage',
        unit_of_measurement: 'V',
      }),
      'sensor.nutdev1_output_voltage': entity('sensor.nutdev1_output_voltage', '230', {
        friendly_name: 'Output voltage',
        unit_of_measurement: 'V',
      }),
      'sensor.nutdev1_battery_runtime': entity('sensor.nutdev1_battery_runtime', '1320', {
        friendly_name: 'Battery runtime',
        unit_of_measurement: 's',
      }),
    };

    const devices = buildUpsDeviceOptions({
      entities,
      areas: [{ area_id: 'server-room', name: 'Server Room' }],
      deviceRegistry: [{ id: 'device-ups', area_id: 'server-room', name: 'Rack UPS' }],
      entityRegistry: Object.keys(entities).map((entityId) => ({
        entity_id: entityId,
        device_id: 'device-ups',
      })),
    });

    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({
      deviceId: 'device-ups',
      name: 'Rack UPS',
      room: 'Server Room',
      defaultStatusEntityId: 'sensor.nutdev1_status',
      defaultMetricEntityIds: [
        'sensor.nutdev1_battery_charge',
        'sensor.nutdev1_load',
        'sensor.nutdev1_input_voltage',
        'sensor.nutdev1_output_voltage',
        'sensor.nutdev1_battery_runtime',
      ],
    });
  });

  it('falls back to status data when status is absent', () => {
    const entities: HassEntities = {
      'sensor.nutdev1_battery_charge': entity('sensor.nutdev1_battery_charge', '83', {
        friendly_name: 'Battery charge',
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_status_data': entity('sensor.nutdev1_status_data', 'OB', {
        friendly_name: 'Status data',
      }),
    };

    const devices = buildUpsDeviceOptions({
      entities,
      entityRegistry: Object.keys(entities).map((entityId) => ({
        entity_id: entityId,
        device_id: 'device-ups',
      })),
    });

    expect(devices[0]?.defaultStatusEntityId).toBe('sensor.nutdev1_status_data');
  });

  it('supports input load when regular load is absent', () => {
    const entities: HassEntities = {
      'sensor.nutdev1_battery_charge': entity('sensor.nutdev1_battery_charge', '83', {
        friendly_name: 'Battery charge',
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_input_load': entity('sensor.nutdev1_input_load', '51', {
        friendly_name: 'Input load',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_status': entity('sensor.nutdev1_status', 'Online', {
        friendly_name: 'Status',
      }),
    };

    const devices = buildUpsDeviceOptions({
      entities,
      entityRegistry: Object.keys(entities).map((entityId) => ({
        entity_id: entityId,
        device_id: 'device-ups',
      })),
    });

    expect(devices[0]?.defaultMetricEntityIds).toContain('sensor.nutdev1_input_load');
  });

  it('keeps runtime optional when no runtime sensor exists', () => {
    const entities: HassEntities = {
      'sensor.nutdev1_battery_charge': entity('sensor.nutdev1_battery_charge', '83', {
        friendly_name: 'Battery charge',
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_load': entity('sensor.nutdev1_load', '33', {
        friendly_name: 'Load',
        unit_of_measurement: '%',
      }),
      'sensor.nutdev1_status': entity('sensor.nutdev1_status', 'Online', {
        friendly_name: 'Status',
      }),
    };

    const devices = buildUpsDeviceOptions({
      entities,
      entityRegistry: Object.keys(entities).map((entityId) => ({
        entity_id: entityId,
        device_id: 'device-ups',
      })),
    });

    expect(devices[0]?.defaultMetricEntityIds).toEqual([
      'sensor.nutdev1_battery_charge',
      'sensor.nutdev1_load',
    ]);
  });

  it('ignores unrelated room sensors that are not siblings on the same device', () => {
    const entities: HassEntities = {
      'sensor.nutdev1_battery_charge': entity('sensor.nutdev1_battery_charge', '97', {
        friendly_name: 'Battery charge',
        device_class: 'battery',
        unit_of_measurement: '%',
      }),
      'sensor.server_room_temperature': entity('sensor.server_room_temperature', '21.5', {
        friendly_name: 'Server Room Temperature',
        device_class: 'temperature',
        unit_of_measurement: '°C',
      }),
    };

    const devices = buildUpsDeviceOptions({
      entities,
      areas: [{ area_id: 'server-room', name: 'Server Room' }],
      entityRegistry: [
        {
          entity_id: 'sensor.nutdev1_battery_charge',
          device_id: 'device-ups',
          area_id: 'server-room',
        },
        {
          entity_id: 'sensor.server_room_temperature',
          device_id: 'device-temp',
          area_id: 'server-room',
        },
      ],
    });

    expect(devices).toHaveLength(1);
    expect(devices[0].metrics.map((metric) => metric.entityId)).toEqual([
      'sensor.nutdev1_battery_charge',
    ]);
  });

  it('maps known status states to the expected tones', () => {
    expect(getUpsStatusTone('OL')).toBe('green');
    expect(getUpsStatusTone('charging')).toBe('green');
    expect(getUpsStatusTone('On Battery')).toBe('amber');
    expect(getUpsStatusTone('Replace Battery')).toBe('red');
    expect(getUpsStatusTone('unavailable')).toBe('neutral');
  });
});
