import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { mapClimateDevice } from '../map-climate-device';

function createClimateEntity(
  attributes: Record<string, unknown>,
  entityId = 'climate.hallway',
  state = 'heat'
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '2026-05-17T00:00:00.000Z',
    last_updated: '2026-05-17T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('mapClimateDevice', () => {
  it('preserves supported Home Assistant HVAC modes', () => {
    const device = mapClimateDevice(
      'climate.hallway',
      createClimateEntity({
        temperature: 21,
        current_temperature: 20,
        hvac_modes: ['heat', 'cool', 'fan_only'],
      }),
      'Hallway',
      'Hallway'
    );

    expect(device.supportedHvacModes).toEqual(['heat', 'cool', 'fan_only']);
  });

  it('preserves Home Assistant Fahrenheit climate units', () => {
    const device = mapClimateDevice(
      'climate.hallway',
      createClimateEntity({
        temperature: 72,
        current_temperature: 70,
        unit_of_measurement: '°F',
      }),
      'Hallway',
      'Hallway'
    );

    expect(device.temperature).toBe(72);
    expect(device.currentTemperature).toBe(70);
    expect(device.temperatureUnit).toBe('fahrenheit');
  });

  it('ignores malformed HVAC mode entries', () => {
    const device = mapClimateDevice(
      'climate.hallway',
      createClimateEntity({
        temperature: 21,
        current_temperature: 20,
        hvac_modes: ['heat', 1, null, 'cool'],
      }),
      'Hallway',
      'Hallway'
    );

    expect(device.supportedHvacModes).toEqual(['heat', 'cool']);
  });

  it('maps Home Assistant water heaters as climate card devices', () => {
    const device = mapClimateDevice(
      'water_heater.boiler',
      createClimateEntity(
        {
          temperature: 55,
          current_temperature: 48,
          operation_list: ['eco', 'performance', 'off'],
        },
        'water_heater.boiler',
        'eco'
      ),
      'Boiler',
      'Utility'
    );

    expect(device).toEqual(
      expect.objectContaining({
        id: 'water_heater.boiler',
        temperature: 55,
        currentTemperature: 48,
        mode: 'eco',
        supportedHvacModes: ['eco', 'performance', 'off'],
        serviceDomain: 'water_heater',
      })
    );
  });

  it('does not fall back to generic climate mode controls for water heaters', () => {
    const device = mapClimateDevice(
      'water_heater.boiler',
      createClimateEntity(
        {
          temperature: 55,
          current_temperature: 48,
        },
        'water_heater.boiler',
        'eco'
      ),
      'Boiler',
      'Utility'
    );

    expect(device.supportedHvacModes).toEqual([]);
  });
});
