import { describe, expect, it } from 'vitest';
import {
  type IntelligenceEntityReference,
  interpretSimpleControlSuggestion,
  interpretSimpleStateQuestion,
  isExplicitIntelligenceControlRequest,
  validateControlSuggestions,
} from './intelligence-chat';

const entities: IntelligenceEntityReference[] = [
  {
    id: 'home_assistant:light.office_ceiling',
    providerId: 'home_assistant',
    name: 'Ceiling light',
    room: 'Office',
    type: 'light',
    state: 'off',
  },
  {
    id: 'home_assistant:light.desk_lamp',
    providerId: 'home_assistant',
    name: 'Desk lamp',
    room: 'Office',
    type: 'light',
    state: 'off',
  },
  {
    id: 'openhab:switch.coffee',
    providerId: 'openhab',
    name: 'Coffee maker',
    room: 'Kitchen',
    type: 'switch',
    state: 'off',
  },
];

const temperatureEntities: IntelligenceEntityReference[] = [
  {
    id: 'home_assistant:sensor.bathroom_temperature',
    providerId: 'home_assistant',
    name: 'Bathroom temperature',
    room: 'Bathroom',
    type: 'temperature',
    value: 22.4,
    unit: '°C',
  },
  {
    id: 'home_assistant:climate.bathroom',
    providerId: 'home_assistant',
    name: 'Bathroom thermostat',
    room: 'Bathroom',
    type: 'temperature',
    value: 22,
    unit: '°C',
  },
  {
    id: 'home_assistant:sensor.bedroom_temperature',
    providerId: 'home_assistant',
    name: 'Bedroom temperature',
    room: 'Bedroom',
    type: 'temperature',
    value: 68,
    unit: '°F',
  },
];

const humidityEntities: IntelligenceEntityReference[] = [
  {
    id: 'home_assistant:sensor.basement_humidity',
    providerId: 'home_assistant',
    name: 'Basement humidity',
    room: 'Basement',
    type: 'humidity',
    value: 61,
    unit: '%',
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
];

describe('read-only intelligence control suggestions', () => {
  it('distinguishes a direct command from a question or autonomous suggestion', () => {
    expect(isExplicitIntelligenceControlRequest('Turn off the office lights')).toBe(true);
    expect(isExplicitIntelligenceControlRequest('Please turn on the desk lamp')).toBe(true);
    expect(isExplicitIntelligenceControlRequest('Could you turn off the office lights?')).toBe(
      true
    );
    expect(isExplicitIntelligenceControlRequest('Should I turn off the office lights?')).toBe(
      false
    );
    expect(isExplicitIntelligenceControlRequest('The office lights are still on')).toBe(false);
  });

  it('interprets a room-wide lighting request without executing it', () => {
    expect(interpretSimpleControlSuggestion('Turn on the office lights', entities)).toEqual([
      {
        operation: 'turn_on',
        entityIds: ['home_assistant:light.office_ceiling', 'home_assistant:light.desk_lamp'],
      },
    ]);
  });

  it('resolves a specifically named lamp instead of the whole room', () => {
    expect(interpretSimpleControlSuggestion('Turn on the desk lamp', entities)).toEqual([
      { operation: 'turn_on', entityIds: ['home_assistant:light.desk_lamp'] },
    ]);
  });

  it('does not broaden a possessive lamp name to every light in the room', () => {
    const officeLights: IntelligenceEntityReference[] = [
      {
        id: 'home_assistant:light.vishals_desk_lamp',
        providerId: 'home_assistant',
        name: "Vishal's Desk Lamp",
        room: 'Office',
        type: 'light',
        state: 'on',
      },
      {
        id: 'home_assistant:light.neon_lights',
        providerId: 'home_assistant',
        name: 'Neon Lights',
        room: 'Office',
        type: 'light',
        state: 'on',
      },
      {
        id: 'home_assistant:light.sofias_desk_lamp',
        providerId: 'home_assistant',
        name: "Sofia's Desk Lamp",
        room: 'Office',
        type: 'light',
        state: 'on',
      },
    ];

    expect(
      interpretSimpleControlSuggestion("Turn off Sofia's lamp in Office", officeLights)
    ).toEqual([
      {
        operation: 'turn_off',
        entityIds: ['home_assistant:light.sofias_desk_lamp'],
      },
    ]);
    expect(
      interpretSimpleControlSuggestion("Turn off Sofi's desk lamp in Office", officeLights)
    ).toEqual([
      {
        operation: 'turn_off',
        entityIds: ['home_assistant:light.sofias_desk_lamp'],
      },
    ]);
    expect(
      interpretSimpleControlSuggestion("Turn off Sfoia's desk lamp in Office", officeLights)
    ).toEqual([
      {
        operation: 'turn_off',
        entityIds: ['home_assistant:light.sofias_desk_lamp'],
      },
    ]);
    expect(interpretSimpleControlSuggestion('Turn off the lamp in Office', officeLights)).toEqual(
      []
    );
    expect(
      interpretSimpleControlSuggestion("Turn off Sofi's desk lamp in Office", [
        ...officeLights,
        {
          id: 'home_assistant:light.sofies_desk_lamp',
          providerId: 'home_assistant',
          name: "Sofie's Desk Lamp",
          room: 'Office',
          type: 'light',
          state: 'on',
        },
      ])
    ).toEqual([]);
  });

  it('rejects unknown entity ids returned by a model', () => {
    expect(
      validateControlSuggestions(
        [
          {
            operation: 'turn_off',
            entityIds: ['openhab:switch.coffee', 'home_assistant:lock.front_door'],
          },
        ],
        entities
      )
    ).toEqual([{ operation: 'turn_off', entityIds: ['openhab:switch.coffee'] }]);
  });

  it('answers room-scoped light count questions from sanitized state', () => {
    expect(
      interpretSimpleStateQuestion(
        'How many lights are on in the office?',
        entities.map((entity, index) =>
          index === 0 ? { ...entity, state: 'on' as const } : entity
        )
      )
    ).toEqual({ kind: 'lights_on_count', count: 1, room: 'Office' });
  });

  it('answers which room an active light is in from verified state', () => {
    expect(
      interpretSimpleStateQuestion(
        'Which room is the light on in?',
        entities.map((entity, index) =>
          index === 0 ? { ...entity, state: 'on' as const } : entity
        )
      )
    ).toEqual({
      kind: 'lights_on_locations',
      lights: [{ name: 'Ceiling light', room: 'Office' }],
    });
  });

  it('lists every active light and preserves missing room assignments', () => {
    expect(
      interpretSimpleStateQuestion('Where are the lights running?', [
        { ...entities[0], state: 'on' },
        { ...entities[1], state: 'on', room: undefined },
      ])
    ).toEqual({
      kind: 'lights_on_locations',
      lights: [
        { name: 'Ceiling light', room: 'Office' },
        { name: 'Desk lamp', room: undefined },
      ],
    });
  });

  it('answers a room temperature question from every verified reading in that room', () => {
    expect(
      interpretSimpleStateQuestion('What is the temperature in the bathroom?', temperatureEntities)
    ).toEqual({
      kind: 'temperature',
      room: 'Bathroom',
      readings: [
        { name: 'Bathroom temperature', room: 'Bathroom', value: 22.4, unit: '°C' },
        { name: 'Bathroom thermostat', room: 'Bathroom', value: 22, unit: '°C' },
      ],
    });
  });

  it('answers a whole-home temperature question with the room for every verified reading', () => {
    expect(
      interpretSimpleStateQuestion('What are the temperature in the home?', temperatureEntities)
    ).toEqual({
      kind: 'temperature',
      room: undefined,
      readings: [
        { name: 'Bathroom temperature', room: 'Bathroom', value: 22.4, unit: '°C' },
        { name: 'Bathroom thermostat', room: 'Bathroom', value: 22, unit: '°C' },
        { name: 'Bedroom temperature', room: 'Bedroom', value: 68, unit: '°F' },
      ],
    });
  });

  it('does not guess a temperature when the requested room is unknown', () => {
    expect(
      interpretSimpleStateQuestion('What is the temperature in the garage?', temperatureEntities)
    ).toBeNull();
  });

  it('answers a room humidity question from verified sensor state', () => {
    expect(
      interpretSimpleStateQuestion('What is the humidity in the basement?', humidityEntities)
    ).toEqual({
      kind: 'humidity',
      room: 'Basement',
      readings: [{ name: 'Basement humidity', room: 'Basement', value: 61, unit: '%' }],
    });
  });

  it('answers a whole-home humidity question with room labels', () => {
    expect(interpretSimpleStateQuestion('What is the humidity?', humidityEntities)).toEqual({
      kind: 'humidity',
      room: undefined,
      readings: [
        { name: 'Basement humidity', room: 'Basement', value: 61, unit: '%' },
        { name: 'Bathroom humidity', room: 'Bathroom', value: 48, unit: '%' },
      ],
    });
  });

  it('does not guess humidity when the requested room is unknown', () => {
    expect(
      interpretSimpleStateQuestion('What is the humidity in the garage?', humidityEntities)
    ).toBeNull();
  });

  it('never treats a temperature reference as a controllable entity', () => {
    expect(
      validateControlSuggestions(
        [
          {
            operation: 'turn_off',
            entityIds: ['home_assistant:sensor.bathroom_temperature'],
          },
        ],
        temperatureEntities
      )
    ).toEqual([]);
  });

  it('never treats a humidity reference as a controllable entity', () => {
    expect(
      validateControlSuggestions(
        [
          {
            operation: 'turn_off',
            entityIds: ['home_assistant:sensor.basement_humidity'],
          },
        ],
        humidityEntities
      )
    ).toEqual([]);
  });
});
