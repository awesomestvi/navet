import type {
  PlatformTaskDeviceReference,
  PlatformTaskEntityMap,
  PlatformTaskEntityReference,
  PlatformTaskRoomReference,
} from '@navet/app/platform/provider-feature-models';
import type { AutomationTask } from '../types';
import { createTaskRoomMaps, getTaskEntityName, resolveTaskEntityRoom } from './task-runtime';

interface MapAutomationTasksOptions {
  entities: PlatformTaskEntityMap | null;
  rooms: PlatformTaskRoomReference[];
  devices: PlatformTaskDeviceReference[];
  entityReferences: PlatformTaskEntityReference[];
  locale?: string;
}

export function mapAutomationTasks({
  entities,
  rooms,
  devices,
  entityReferences,
  locale,
}: MapAutomationTasksOptions): AutomationTask[] {
  if (!entities) {
    return [];
  }

  const { roomMap, entityReferenceMap, deviceMap } = createTaskRoomMaps({
    rooms,
    devices,
    entityReferences,
  });

  return Object.entries(entities)
    .filter(([entityId]) => entityId.startsWith('automation.'))
    .map(([entityId, entity]) => ({
      id: entityId,
      name: getTaskEntityName(entity),
      room: resolveTaskEntityRoom(entityId, roomMap, entityReferenceMap, deviceMap),
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
