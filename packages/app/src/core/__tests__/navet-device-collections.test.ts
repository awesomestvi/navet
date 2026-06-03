import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { mapNavetEntitiesToDeviceCollection } from '../navet-device-collections';

function createEntity({
  canonicalId,
  externalId,
  type,
  name,
  attributes,
}: {
  canonicalId: string;
  externalId: string;
  type: NavetEntity['type'];
  name: string;
  attributes: Record<string, unknown>;
}): NavetEntity {
  return {
    id: canonicalId,
    canonicalId,
    providerId: 'home_assistant',
    externalId,
    type,
    name,
    room: 'Kitchen',
    primaryState: attributes.value as string | number | boolean | null,
    availability: 'available',
    attributes,
    capabilities: [],
  };
}

describe('mapNavetEntitiesToDeviceCollection', () => {
  it('suppresses helper and sensor cards when a device already has a primary switch card', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:switch.kitchen_main',
        externalId: 'switch.kitchen_main',
        type: 'switch',
        name: 'Kitchen Main',
        attributes: {
          value: 'on',
          deviceId: 'device-kitchen',
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:input_boolean.kitchen_timer',
        externalId: 'input_boolean.kitchen_timer',
        type: 'helper',
        name: 'Kitchen Timer',
        attributes: {
          value: 'off',
          deviceId: 'device-kitchen',
          serviceDomain: 'input_boolean',
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:sensor.kitchen_power',
        externalId: 'sensor.kitchen_power',
        type: 'sensor',
        name: 'Kitchen Power',
        attributes: {
          value: '127',
          unit: 'W',
          deviceId: 'device-kitchen',
          entityType: 'power',
        },
      }),
    ]);

    expect(devices.switches.map((device) => device.id)).toEqual([
      'home_assistant:switch.kitchen_main',
    ]);
    expect(devices.helpers).toHaveLength(0);
    expect(devices.sensors).toHaveLength(0);
  });

  it('suppresses secondary switch cards attached to climate devices', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:climate.hallway',
        externalId: 'climate.hallway',
        type: 'climate',
        name: 'Hallway Climate',
        attributes: {
          value: 'heat',
          deviceId: 'device-climate',
          temperature: 21,
          currentTemperature: 20,
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:switch.hallway_boost',
        externalId: 'switch.hallway_boost',
        type: 'switch',
        name: 'Hallway Boost',
        attributes: {
          value: 'off',
          deviceId: 'device-climate',
        },
      }),
    ]);

    expect(devices.climate.map((device) => device.id)).toEqual(['home_assistant:climate.hallway']);
    expect(devices.switches).toHaveLength(0);
  });

  it('suppresses accessory switch cards attached to fan devices', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:fan.xiaomi_smart_tower_fan',
        externalId: 'fan.xiaomi_smart_tower_fan',
        type: 'fan',
        name: 'Xiaomi Smart Tower Fan',
        attributes: {
          value: 'on',
          deviceId: 'device-xiaomi-fan',
          percentage: 33,
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:switch.xiaomi_smart_tower_fan_physical_control_locked',
        externalId: 'switch.xiaomi_smart_tower_fan_physical_control_locked',
        type: 'switch',
        name: 'Xiaomi Smart Tower Fan Physical Control Locked',
        attributes: {
          value: 'off',
          deviceId: 'device-xiaomi-fan',
        },
      }),
    ]);

    expect(devices.fans.map((device) => device.id)).toEqual([
      'home_assistant:fan.xiaomi_smart_tower_fan',
    ]);
    expect(devices.switches).toHaveLength(0);
  });

  it('keeps only the primary switch card when a device exposes multiple switches', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:switch.kitchen_boost',
        externalId: 'switch.kitchen_boost',
        type: 'switch',
        name: 'Kitchen Boost',
        attributes: {
          value: 'off',
          deviceId: 'device-kitchen',
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:switch.kitchen_main',
        externalId: 'switch.kitchen_main',
        type: 'switch',
        name: 'Kitchen Main',
        attributes: {
          value: 'on',
          deviceId: 'device-kitchen',
        },
      }),
    ]);

    expect(devices.switches.map((device) => device.id)).toEqual([
      'home_assistant:switch.kitchen_main',
    ]);
  });

  it('does not surface brightness accessory switches as the primary switch card', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:switch.xiaomi_smart_tower_fan',
        externalId: 'switch.xiaomi_smart_tower_fan',
        type: 'switch',
        name: 'Xiaomi Smart Tower Fan',
        attributes: {
          value: 'on',
          deviceId: 'device-xiaomi-fan',
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:switch.xiaomi_smart_tower_fan_brightness',
        externalId: 'switch.xiaomi_smart_tower_fan_brightness',
        type: 'switch',
        name: 'Xiaomi Smart Tower Fan Brightness',
        attributes: {
          value: 'off',
          deviceId: 'device-xiaomi-fan',
        },
      }),
    ]);

    expect(devices.switches.map((device) => device.id)).toEqual([
      'home_assistant:switch.xiaomi_smart_tower_fan',
    ]);
  });

  it('suppresses helper buttons attached to sensor devices', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:sensor.aqara_humidity_sensor_humidity',
        externalId: 'sensor.aqara_humidity_sensor_humidity',
        type: 'sensor',
        name: 'Aqara Humidity Sensor',
        attributes: {
          value: '48',
          unit: '%',
          deviceId: 'device-aqara-humidity',
          entityType: 'humidity',
        },
      }),
      createEntity({
        canonicalId: 'home_assistant:button.aqara_humidity_sensor_identify',
        externalId: 'button.aqara_humidity_sensor_identify',
        type: 'helper',
        name: 'Aqara Humidity Sensor Identify',
        attributes: {
          value: '',
          deviceId: 'device-aqara-humidity',
          entityType: 'button',
          serviceDomain: 'button',
          serviceAction: 'press',
        },
      }),
    ]);

    expect(devices.sensors.map((device) => device.id)).toEqual([
      'home_assistant:sensor.aqara_humidity_sensor_humidity',
    ]);
    expect(devices.helpers).toHaveLength(0);
  });

  it('keeps the underlying device id on camera devices', () => {
    const devices = mapNavetEntitiesToDeviceCollection([
      createEntity({
        canonicalId: 'home_assistant:camera.driveway',
        externalId: 'camera.driveway',
        type: 'camera',
        name: 'Driveway',
        attributes: {
          value: 'streaming',
          deviceId: 'device-driveway',
          entityPicture: '/api/camera_proxy/camera.driveway',
          isStreamCapable: true,
        },
      }),
    ]);

    expect(devices.cameras).toMatchObject([
      {
        id: 'home_assistant:camera.driveway',
        sourceDeviceId: 'device-driveway',
      },
    ]);
  });
});
