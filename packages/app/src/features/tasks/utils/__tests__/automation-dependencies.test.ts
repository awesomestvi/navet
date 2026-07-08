import { makeTaskEntity } from '@navet/app/features/tasks/test-utils';
import { describe, expect, it } from 'vitest';
import {
  buildAutomationDependencySummaries,
  getAutomationConfigEntityIds,
} from '../automation-dependencies';

describe('automation dependencies', () => {
  it('collects referenced entity ids from nested automation config', () => {
    expect(
      getAutomationConfigEntityIds({
        triggers: [{ entity_id: 'binary_sensor.motion' }],
        conditions: [{ value_template: "{{ is_state('sun.sun', 'below_horizon') }}" }],
        actions: [
          {
            action: 'light.turn_on',
            target: { entity_id: ['light.kitchen', 'light.counter'] },
          },
        ],
      })
    ).toEqual(['binary_sensor.motion', 'light.counter', 'light.kitchen', 'sun.sun']);
  });

  it('maps dependencies to friendly names and current states', () => {
    expect(
      buildAutomationDependencySummaries(['light.kitchen', 'sun.sun', 'sensor.missing'], {
        'light.kitchen': makeTaskEntity({
          entity_id: 'light.kitchen',
          state: 'off',
          attributes: { friendly_name: 'Kitchen light' },
        }),
        'sun.sun': makeTaskEntity({
          entity_id: 'sun.sun',
          state: 'below_horizon',
        }),
      })
    ).toEqual([
      {
        entityId: 'light.kitchen',
        label: 'Kitchen light',
        state: 'off',
      },
      {
        entityId: 'sun.sun',
        label: 'sun.sun',
        state: 'below_horizon',
      },
    ]);
  });
});
