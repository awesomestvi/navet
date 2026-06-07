import { describe, expect, it } from 'vitest';
import type {
  NavetAlarmAction,
  NavetAlarmCodeFormat,
  NavetAlarmEntity,
  NavetAlarmState,
} from './alarm-types';

describe('alarm-types', () => {
  it('exports the normalized alarm model surface', () => {
    const entity: NavetAlarmEntity = {
      id: 'home_assistant:alarm_control_panel.home',
      name: 'Home Alarm',
      state: 'disarmed' satisfies NavetAlarmState,
      supportedActions: ['arm_away', 'disarm'] satisfies NavetAlarmAction[],
      codeFormat: 'number' satisfies NavetAlarmCodeFormat,
      provider: 'home_assistant',
    };

    expect(entity).toMatchObject({
      state: 'disarmed',
      supportedActions: ['arm_away', 'disarm'],
      codeFormat: 'number',
    });
  });
});
