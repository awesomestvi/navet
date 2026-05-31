import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const updateEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'update.router_firmware',
    state: 'on',
    attributes: {
      friendly_name: 'Router Firmware',
      installed_version: '1.0.0',
      latest_version: '1.1.0',
      in_progress: false,
      ...overrides,
    },
  });

export const updateEntityFixtures = makeEntityFixtures(
  'update',
  'router_firmware',
  updateEntityFactory().attributes
);
