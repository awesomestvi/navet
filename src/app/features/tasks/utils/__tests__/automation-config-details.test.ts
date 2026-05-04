import { describe, expect, it } from 'vitest';
import { makeHassEntity } from '../../test-utils';
import { buildAutomationConfigSections } from '../automation-config-details';

describe('buildAutomationConfigSections', () => {
  it('prefers the explicit description for the overview', () => {
    const sections = buildAutomationConfigSections(
      {
        description: 'Starts the morning routine before everyone wakes up.',
        triggers: [{ trigger: 'time', at: '07:00:00' }],
        actions: [{ action: 'light.turn_on', target: { entity_id: 'light.kitchen' } }],
      },
      {
        entities: {
          'light.kitchen': makeHassEntity({
            entity_id: 'light.kitchen',
            state: 'off',
            attributes: { friendly_name: 'Kitchen light' },
          }),
        },
      }
    );

    expect(sections.overview).toBe('Starts the morning routine before everyone wakes up.');
  });

  it('uses friendly names for triggers, conditions, and targets', () => {
    const sections = buildAutomationConfigSections(
      {
        triggers: [{ trigger: 'state', entity_id: 'binary_sensor.motion', to: 'on' }],
        conditions: [{ condition: 'numeric_state', entity_id: 'sensor.temperature', above: 21 }],
        actions: [
          {
            action: 'light.turn_on',
            target: { entity_id: ['light.kitchen', 'light.counter'] },
          },
        ],
      },
      {
        entities: {
          'binary_sensor.motion': makeHassEntity({
            entity_id: 'binary_sensor.motion',
            state: 'off',
            attributes: { friendly_name: 'Kitchen motion' },
          }),
          'sensor.temperature': makeHassEntity({
            entity_id: 'sensor.temperature',
            state: '20',
            attributes: { friendly_name: 'Kitchen temperature' },
          }),
          'light.kitchen': makeHassEntity({
            entity_id: 'light.kitchen',
            state: 'off',
            attributes: { friendly_name: 'Kitchen light' },
          }),
          'light.counter': makeHassEntity({
            entity_id: 'light.counter',
            state: 'off',
            attributes: { friendly_name: 'Counter light' },
          }),
        },
      }
    );

    expect(sections.triggers).toEqual(['Kitchen motion changes to on']);
    expect(sections.conditions).toEqual(['Kitchen temperature is above 21']);
    expect(sections.actions).toEqual(['Turn on Kitchen light and Counter light']);
    expect(sections.overview).toBe(
      'Turn on Kitchen light and Counter light when kitchen motion changes to on'
    );
  });

  it('falls back to raw ids when referenced entities are missing', () => {
    const sections = buildAutomationConfigSections({
      actions: [{ action: 'switch.turn_off', target: { entity_id: 'switch.espresso_machine' } }],
    });

    expect(sections.actions).toEqual(['Turn off switch.espresso_machine']);
  });

  it('summarizes direct entity ids inside action data', () => {
    const sections = buildAutomationConfigSections(
      {
        actions: [
          {
            action: 'scene.turn_on',
            data: {
              entity_id: 'scene.movie_time',
            },
          },
        ],
      },
      {
        entities: {
          'scene.movie_time': makeHassEntity({
            entity_id: 'scene.movie_time',
            state: 'scening',
            attributes: { friendly_name: 'Movie time' },
          }),
        },
      }
    );

    expect(sections.actions).toEqual(['Turn on scene with entity id Movie time']);
  });
});
