import type {
  PlatformTaskEntityMap,
  PlatformTaskEntityState,
} from '@navet/app/platform/provider-feature-models';
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

export function makeTaskEntity(overrides: Partial<HassEntity> = {}): PlatformTaskEntityState {
  const entity = makeHassEntity(overrides);

  return {
    entityId: entity.entity_id,
    state: entity.state,
    name:
      typeof entity.attributes.friendly_name === 'string'
        ? entity.attributes.friendly_name
        : undefined,
    attributes: entity.attributes,
  };
}

export function makeTaskEntityMap(
  entries: Array<[entityId: string, overrides?: Partial<HassEntity>]>
): PlatformTaskEntityMap {
  return Object.fromEntries(
    entries.map(([entityId, overrides]) => [
      entityId,
      makeTaskEntity({ entity_id: entityId, ...overrides }),
    ])
  );
}
