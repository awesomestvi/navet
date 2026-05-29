import { describe, expect, it } from 'vitest';
import {
  mapBatterySensorRowsFromEntities,
  selectBatterySensorRowsFromHa,
} from '@/app/infrastructure/home-assistant/home-assistant-battery-selectors';
import { sensorEntityFactory } from '@/test/fixtures/home-assistant/entities/sensor';

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

  it('maps provider-runtime entity snapshots directly', () => {
    expect(
      mapBatterySensorRowsFromEntities({
        'sensor.phone_battery': {
          entityId: 'sensor.phone_battery',
          state: '14',
          attributes: {
            friendly_name: 'Phone Battery',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
        },
        'sensor.tablet_battery': {
          entityId: 'sensor.tablet_battery',
          state: '82',
          attributes: {
            friendly_name: 'Tablet Battery',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
        },
        'sensor.office_temperature': {
          entityId: 'sensor.office_temperature',
          state: '21',
          attributes: {
            friendly_name: 'Office Temperature',
            device_class: 'temperature',
          },
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
