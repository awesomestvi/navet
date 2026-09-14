import { describe, expect, it } from 'vitest';
import { buildHomeyProviderRooms, mapHomeySnapshotToNavetEntities } from './homey-mappers';
import type { HomeySnapshot } from './homey-types';

function createSnapshot(zoneName: string): HomeySnapshot {
  return {
    connected: true,
    zones: {
      zone_kitchen: {
        id: 'zone_kitchen',
        name: zoneName,
      },
      zone_empty: {
        id: 'zone_empty',
        name: 'Empty room',
      },
    },
    devices: {
      kitchen_light: {
        id: 'kitchen_light',
        name: 'Kitchen light',
        class: 'light',
        zone: 'zone_kitchen',
        capabilities: ['onoff'],
        capabilitiesObj: {
          onoff: { value: true },
        },
      },
      loose_switch: {
        id: 'loose_switch',
        name: 'Loose switch',
        class: 'socket',
        capabilities: ['onoff'],
        capabilitiesObj: {
          onoff: { value: false },
        },
      },
    },
  };
}

describe('homey-mappers room identity', () => {
  it('attaches electrical readings to a socket card, including zero readings while off', () => {
    const snapshot = createSnapshot('Kitchen');
    snapshot.devices.loose_switch.capabilitiesObj = {
      onoff: { value: false },
      measure_power: { value: 0, units: 'W' },
      measure_voltage: { value: 230.1, units: 'V' },
      measure_current: { value: 0, units: 'A' },
      meter_power: { value: 12.45, units: 'kWh', title: 'Energy' },
    };
    const entities = mapHomeySnapshotToNavetEntities(snapshot);
    expect(entities.find((entity) => entity.externalId === 'loose_switch')).toMatchObject({
      type: 'switch',
      attributes: {
        on: false,
        metrics: [
          { label: 'Power', value: 0, unit: 'W', icon: 'zap', category: 'measurement' },
          { label: 'Voltage', value: 230.1, unit: 'V', icon: 'gauge', category: 'measurement' },
          { label: 'Current', value: 0, unit: 'A', icon: 'activity', category: 'measurement' },
          { label: 'Energy', value: 12.45, unit: 'kWh', icon: 'activity', category: 'measurement' },
        ],
      },
    });
    expect(
      entities.find((entity) => entity.externalId === 'loose_switch#meter_power')
    ).toMatchObject({
      type: 'sensor',
      primaryState: 12.45,
      attributes: { unit: 'kWh', deviceClass: 'energy' },
    });
  });

  it('normalizes electrical units and omits unavailable measurement values', () => {
    const snapshot = createSnapshot('Kitchen');
    snapshot.devices.loose_switch.capabilitiesObj = {
      onoff: { value: true },
      measure_power: { value: 1.5, units: 'kW' },
      measure_voltage: { value: null, units: 'V' },
      measure_current: { value: Number.NaN, units: 'A' },
      meter_power: { value: 1250, units: 'Wh' },
    };
    const metrics = mapHomeySnapshotToNavetEntities(snapshot).find(
      (entity) => entity.externalId === 'loose_switch'
    )?.attributes.metrics;
    expect(metrics).toEqual([
      expect.objectContaining({ label: 'Power', value: 1500, unit: 'W' }),
      expect.objectContaining({ label: 'Energy', value: 1.25, unit: 'kWh' }),
    ]);
    snapshot.devices.loose_switch.capabilitiesObj = { onoff: { value: false } };
    expect(
      mapHomeySnapshotToNavetEntities(snapshot).find(
        (entity) => entity.externalId === 'loose_switch'
      )?.attributes.metrics
    ).toEqual([]);
  });

  it('keeps membership stable when a zone display name changes', () => {
    const snapshot = createSnapshot('Cooking space');
    const entities = mapHomeySnapshotToNavetEntities(snapshot);
    const rooms = buildHomeyProviderRooms(snapshot);

    expect(entities.find((entity) => entity.externalId === 'kitchen_light')).toEqual(
      expect.objectContaining({
        room: 'Cooking space',
        roomId: 'homey:zone_kitchen',
      })
    );
    expect(entities.find((entity) => entity.externalId === 'loose_switch')).toEqual(
      expect.objectContaining({
        room: 'Unassigned',
        roomId: undefined,
      })
    );
    expect(rooms).toEqual([
      expect.objectContaining({
        canonicalId: 'homey:zone_kitchen',
        name: 'Cooking space',
        memberIds: ['homey:kitchen_light'],
      }),
      expect.objectContaining({
        canonicalId: 'homey:zone_empty',
        name: 'Empty room',
        memberIds: [],
      }),
    ]);
  });
});
