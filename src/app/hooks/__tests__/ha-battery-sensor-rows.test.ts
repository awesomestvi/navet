import { describe, expect, it } from 'vitest';
import { sensorEntityFactory } from '@/test/fixtures/home-assistant/entities/sensor';
import { selectBatterySensorRowsFromHa } from '../ha-battery-sensor-rows';

describe('selectBatterySensorRowsFromHa', () => {
  it('returns only numeric battery sensors sorted from low to high', () => {
    const tabletBattery = sensorEntityFactory({
      friendly_name: 'Tablet Battery',
      device_class: 'battery',
      unit_of_measurement: '%',
    });
    tabletBattery.entity_id = 'sensor.tablet_battery';
    tabletBattery.state = '82';

    const phoneBattery = sensorEntityFactory({
      friendly_name: 'Phone Battery',
      device_class: 'battery',
      unit_of_measurement: '%',
    });
    phoneBattery.entity_id = 'sensor.phone_battery';
    phoneBattery.state = '14';

    const invalidBattery = sensorEntityFactory({
      friendly_name: 'Unknown Battery',
      device_class: 'battery',
      unit_of_measurement: '%',
    });
    invalidBattery.entity_id = 'sensor.unknown_battery';
    invalidBattery.state = 'unknown';

    const temperatureSensor = sensorEntityFactory();

    expect(
      selectBatterySensorRowsFromHa({
        entities: {
          [tabletBattery.entity_id]: tabletBattery,
          [phoneBattery.entity_id]: phoneBattery,
          [invalidBattery.entity_id]: invalidBattery,
          [temperatureSensor.entity_id]: temperatureSensor,
        },
      })
    ).toEqual([
      {
        id: 'sensor.phone_battery',
        name: 'Phone Battery',
        level: 14,
      },
      {
        id: 'sensor.tablet_battery',
        name: 'Tablet Battery',
        level: 82,
      },
    ]);
  });
});
