import type { HassEntity } from 'home-assistant-js-websocket';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';

/** `event.*` entities that look like Feedreader / HA RSS sources (for shallow store compare). */
export function selectFeedreaderEventEntities(
  state: HomeAssistantStore
): Record<string, HassEntity> {
  const all = state.entities;
  if (!all) {
    return {};
  }

  const out: Record<string, HassEntity> = {};
  for (const [entityId, entity] of Object.entries(all)) {
    if (!entityId.startsWith('event.')) {
      continue;
    }

    const attributes = entity.attributes as Record<string, unknown> | undefined;
    if (
      typeof attributes?.link === 'string' &&
      (entityId.includes('feedreader') ||
        typeof attributes?.title === 'string' ||
        typeof attributes?.attribution === 'string')
    ) {
      out[entityId] = entity;
    }
  }

  return out;
}

/** `update.*` entities only — notification list slice (for shallow store compare). */
export function selectUpdateDomainEntities(state: HomeAssistantStore): Record<string, HassEntity> {
  const all = state.entities;
  if (!all) {
    return {};
  }

  const out: Record<string, HassEntity> = {};
  for (const [id, entity] of Object.entries(all)) {
    if (id.startsWith('update.')) {
      out[id] = entity;
    }
  }

  return out;
}
