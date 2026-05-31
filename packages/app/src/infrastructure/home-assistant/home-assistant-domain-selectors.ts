import type { HomeAssistantStore } from '@navet/app/stores/home-assistant-store';
import type { HassEntity } from 'home-assistant-js-websocket';

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

export function selectSecuritySummaryEntities(
  state: HomeAssistantStore
): Record<string, HassEntity> | null {
  const all = state.entities;
  if (!all) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(all).filter(
      ([entityId]) =>
        entityId.startsWith('binary_sensor.') ||
        entityId.startsWith('alarm_control_panel.') ||
        entityId.startsWith('siren.')
    )
  );
}
