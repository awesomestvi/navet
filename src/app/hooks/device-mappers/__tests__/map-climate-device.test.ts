import { describe, expect, it } from 'vitest';
import {
  climateEntityFactory,
  climateEntityFixtures,
} from '@/test/fixtures/home-assistant/entities/climate';
import { waterHeaterEntityFactory } from '@/test/fixtures/home-assistant/entities/water-heater';
import { mapClimateDevice } from '../map-climate-device';

describe('mapClimateDevice', () => {
  it('preserves documented Home Assistant hvac_modes', () => {
    const device = mapClimateDevice(
      climateEntityFixtures.normal.entity_id,
      climateEntityFixtures.normal,
      'Hallway Thermostat',
      'Hallway'
    );

    expect(device.supportedHvacModes).toEqual(['heat', 'cool', 'heat_cool', 'off']);
  });

  it('preserves Fahrenheit units from unit_of_measurement', () => {
    const entity = climateEntityFactory({
      temperature: 72,
      current_temperature: 70,
      unit_of_measurement: '°F',
    });

    const device = mapClimateDevice(entity.entity_id, entity, 'Hallway', 'Hallway');

    expect(device.temperature).toBe(72);
    expect(device.currentTemperature).toBe(70);
    expect(device.temperatureUnit).toBe('fahrenheit');
  });

  it('resolves native_temperature_unit when the standard unit is absent', () => {
    const entity = climateEntityFactory({
      temperature: 72,
      current_temperature: 70,
      native_temperature_unit: '°F',
      unit_of_measurement: undefined,
    });

    const device = mapClimateDevice(entity.entity_id, entity, 'Hallway', 'Hallway');

    expect(device.temperatureUnit).toBe('fahrenheit');
  });

  it('falls back to the Home Assistant config temperature unit', () => {
    const entity = climateEntityFactory({
      temperature: 72,
      current_temperature: 70,
      unit_of_measurement: undefined,
      native_temperature_unit: undefined,
    });

    const device = mapClimateDevice(entity.entity_id, entity, 'Hallway', 'Hallway', '°F');

    expect(device.temperatureUnit).toBe('fahrenheit');
  });

  it('maps heat_cool target ranges from target_temp_high and target_temp_low', () => {
    const entity = climateEntityFactory({
      temperature: undefined,
      current_temperature: 23,
      target_temp_low: 20,
      target_temp_high: 24,
      hvac_action: 'cooling',
      hvac_modes: ['heat', 'cool', 'heat_cool', 'off'],
    });
    entity.state = 'heat_cool';

    const device = mapClimateDevice(entity.entity_id, entity, 'Nest', 'Hallway');

    expect(device.temperature).toBe(24);
    expect(device.currentTemperature).toBe(23);
    expect(device.mode).toBe('heat_cool');
    expect(device.action).toBe('cooling');
  });

  it('filters malformed hvac_modes without crashing', () => {
    const entity = climateEntityFactory({
      hvac_modes: ['heat', 1, null, 'cool'],
    });

    const device = mapClimateDevice(entity.entity_id, entity, 'Hallway', 'Hallway');

    expect(device.supportedHvacModes).toEqual(['heat', 'cool']);
  });

  it('maps water_heater operation_list through the climate card contract', () => {
    const entity = waterHeaterEntityFactory();
    const device = mapClimateDevice(entity.entity_id, entity, 'Boiler', 'Utility');

    expect(device).toEqual(
      expect.objectContaining({
        id: entity.entity_id,
        temperature: 55,
        currentTemperature: 48,
        mode: entity.state,
        supportedHvacModes: ['eco', 'performance', 'off'],
        serviceDomain: 'water_heater',
      })
    );
  });

  it('does not invent generic climate modes for water heaters without operation_list', () => {
    const entity = waterHeaterEntityFactory({
      operation_list: undefined,
    });

    const device = mapClimateDevice(entity.entity_id, entity, 'Boiler', 'Utility');

    expect(device.supportedHvacModes).toEqual([]);
  });
});
