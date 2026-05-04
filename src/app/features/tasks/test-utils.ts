import type { HassEntity } from 'home-assistant-js-websocket';

export function makeHassEntity(overrides: Partial<HassEntity> = {}): HassEntity {
  return {
    entity_id: 'automation.test',
    state: 'on',
    attributes: {},
    context: { id: '', parent_id: null, user_id: null },
    last_changed: '',
    last_updated: '',
    ...overrides,
  } as HassEntity;
}
