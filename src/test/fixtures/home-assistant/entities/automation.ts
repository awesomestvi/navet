import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const automationEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'automation.welcome_home',
    state: 'on',
    attributes: {
      friendly_name: 'Welcome Home',
      last_triggered: '2026-05-04T07:15:00.000Z',
      current: 0,
      mode: 'single',
      ...overrides,
    },
  });

export const automationEntityFixtures = makeEntityFixtures(
  'automation',
  'welcome_home',
  automationEntityFactory().attributes
);
