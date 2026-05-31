import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const alarmControlPanelEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'alarm_control_panel.home_alarm',
    state: 'disarmed',
    attributes: {
      friendly_name: 'Home Alarm',
      code_arm_required: false,
      changed_by: 'app',
      ...overrides,
    },
  });

export const alarmControlPanelEntityFixtures = makeEntityFixtures(
  'alarm_control_panel',
  'home_alarm',
  alarmControlPanelEntityFactory().attributes
);
