import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { buildNavetAiChatContext } from './navet-ai-chat-context';

function entity(input: Partial<NavetEntity> & Pick<NavetEntity, 'canonicalId' | 'type' | 'name'>) {
  return {
    id: input.canonicalId,
    externalId: input.canonicalId.split(':').at(-1) ?? input.canonicalId,
    providerId: 'home_assistant',
    primaryState: 'off',
    availability: 'available',
    attributes: {},
    capabilities: [],
    ...input,
  } as NavetEntity;
}

describe('Navet AI chat context', () => {
  it('includes sanitized controls and verified temperature and humidity readings', () => {
    const values = [
      entity({
        canonicalId: 'home_assistant:light.desk',
        type: 'light',
        name: ' Desk lamp ',
        room: ' Office ',
        primaryState: 'on',
      }),
      entity({
        canonicalId: 'home_assistant:camera.office',
        type: 'camera',
        name: 'Office camera',
      }),
      entity({
        canonicalId: 'home_assistant:switch.secret',
        type: 'switch',
        name: 'Private switch',
        availability: 'unavailable',
      }),
      entity({
        canonicalId: 'home_assistant:sensor.bathroom_temperature',
        type: 'sensor',
        name: 'Bathroom temperature',
        room: 'Bathroom',
        primaryState: '22.4',
        attributes: { deviceClass: 'temperature', unit: '°C' },
      }),
      entity({
        canonicalId: 'home_assistant:climate.bedroom',
        type: 'climate',
        name: 'Bedroom thermostat',
        room: 'Bedroom',
        primaryState: 'heat',
        attributes: { currentTemperature: 68, temperatureUnit: 'F' },
      }),
      entity({
        canonicalId: 'home_assistant:sensor.bathroom_humidity',
        type: 'sensor',
        name: 'Bathroom humidity',
        room: 'Bathroom',
        primaryState: '48',
        attributes: { deviceClass: 'humidity', unit: '%' },
      }),
      entity({
        canonicalId: 'home_assistant:climate.office',
        type: 'climate',
        name: 'Office thermostat',
        room: 'Office',
        primaryState: 'heat',
        attributes: {
          currentTemperature: 21,
          hasCurrentTemperature: false,
          temperature: 21,
          temperatureUnit: 'C',
        },
      }),
    ];

    expect(
      buildNavetAiChatContext(Object.fromEntries(values.map((item) => [item.id, item])))
    ).toEqual([
      {
        id: 'home_assistant:climate.bedroom',
        providerId: 'home_assistant',
        name: 'Bedroom thermostat',
        room: 'Bedroom',
        type: 'temperature',
        value: 68,
        unit: '°F',
      },
      {
        id: 'home_assistant:light.desk',
        providerId: 'home_assistant',
        name: 'Desk lamp',
        room: 'Office',
        type: 'light',
        state: 'on',
      },
      {
        id: 'home_assistant:sensor.bathroom_humidity',
        providerId: 'home_assistant',
        name: 'Bathroom humidity',
        room: 'Bathroom',
        type: 'humidity',
        value: 48,
        unit: '%',
      },
      {
        id: 'home_assistant:sensor.bathroom_temperature',
        providerId: 'home_assistant',
        name: 'Bathroom temperature',
        room: 'Bathroom',
        type: 'temperature',
        value: 22.4,
        unit: '°C',
      },
    ]);
  });
});
