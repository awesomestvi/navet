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

  it('answers a room temperature question from every verified reading in that room', () => {
    expect(
      interpretSimpleStateQuestion('What is the temperature in the bathroom?', temperatureEntities)
    ).toEqual({
      kind: 'temperature',
      room: 'Bathroom',
      readings: [
        { name: 'Bathroom temperature', value: 22.4, unit: '°C' },
        { name: 'Bathroom thermostat', value: 22, unit: '°C' },
      ],
    });
  });

  it('does not guess a temperature when the requested room is unknown', () => {
    expect(
      interpretSimpleStateQuestion('What is the temperature in the garage?', temperatureEntities)
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
});
