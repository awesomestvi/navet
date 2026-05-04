import type { HassEntities } from 'home-assistant-js-websocket';
import { getName, resolveEntityRoom } from '@/app/hooks/ha-entity-utils';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@/app/services/home-assistant.service';
import type { AutomationTask } from '../types';

interface MapAutomationTasksOptions {
  entities: HassEntities | null;
  areas: HomeAssistantAreaRegistryEntry[];
  deviceRegistry: HomeAssistantDeviceRegistryEntry[];
  entityRegistry: HomeAssistantEntityRegistryEntry[];
  locale?: string;
}

export function mapAutomationTasks({
  entities,
  areas,
  deviceRegistry,
  entityRegistry,
  locale,
}: MapAutomationTasksOptions): AutomationTask[] {
  if (!entities) {
    return [];
  }

  const areaMap = new Map(areas.map((area) => [area.area_id, area.name]));
  const entityRegistryMap = new Map(
    entityRegistry.map((entry) => [
      entry.entity_id,
      { area_id: entry.area_id, device_id: entry.device_id },
    ])
  );
  const deviceRegistryMap = new Map(
    deviceRegistry.map((entry) => [entry.id, { area_id: entry.area_id }])
  );

  return Object.entries(entities)
    .filter(([entityId]) => entityId.startsWith('automation.'))
    .map(([entityId, entity]) => ({
      id: entityId,
      name: getName(entity),
      room: resolveEntityRoom(entityId, entity, areaMap, entityRegistryMap, deviceRegistryMap),
      enabled: entity.state === 'on',
      state: entity.state,
      lastTriggered:
        typeof entity.attributes?.last_triggered === 'string'
          ? entity.attributes.last_triggered
          : undefined,
      description:
        typeof entity.attributes?.description === 'string' && entity.attributes.description.trim()
          ? entity.attributes.description
          : undefined,
      mode:
        typeof entity.attributes?.mode === 'string' && entity.attributes.mode.trim()
          ? entity.attributes.mode
          : undefined,
      currentRuns:
        typeof entity.attributes?.current === 'number' && Number.isFinite(entity.attributes.current)
          ? entity.attributes.current
          : undefined,
    }))
    .sort((left, right) => {
      if (left.enabled !== right.enabled) {
        return left.enabled ? -1 : 1;
      }

      return left.name.localeCompare(right.name, locale, { sensitivity: 'base' });
    });
}
