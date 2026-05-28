import type {
  PlatformTaskDeviceReference,
  PlatformTaskEntityMap,
  PlatformTaskEntityReference,
  PlatformTaskRoomReference,
} from '@/app/platform/provider-feature-models';
import type { AutomationRoutine, QuickActionRoutine, TaskRoutineData } from '../types';
import { mapAutomationTasks } from './map-automation-tasks';
import { createTaskRoomMaps, getTaskEntityName, resolveTaskEntityRoom } from './task-runtime';

interface MapTaskRoutinesOptions {
  entities: PlatformTaskEntityMap | null;
  rooms: PlatformTaskRoomReference[];
  devices: PlatformTaskDeviceReference[];
  entityReferences: PlatformTaskEntityReference[];
  locale?: string;
}

export function mapTaskRoutines({
  entities,
  rooms,
  devices,
  entityReferences,
  locale,
}: MapTaskRoutinesOptions): TaskRoutineData {
  if (!entities) {
    return { automations: [], quickActions: [] };
  }

  const { roomMap, entityReferenceMap, deviceMap } = createTaskRoomMaps({
    rooms,
    devices,
    entityReferences,
  });

  const automations: AutomationRoutine[] = mapAutomationTasks({
    entities,
    rooms,
    devices,
    entityReferences,
    locale,
  }).map((task) => ({ ...task, type: 'automation' }));

  const quickActions: QuickActionRoutine[] = Object.entries(entities)
    .filter(([entityId]) => entityId.startsWith('scene.') || entityId.startsWith('script.'))
    .map(([entityId, entity]) => {
      const type: QuickActionRoutine['type'] = entityId.startsWith('scene.') ? 'scene' : 'script';

      return {
        id: entityId,
        type,
        name: getTaskEntityName(entity),
        room: resolveTaskEntityRoom(entityId, roomMap, entityReferenceMap, deviceMap),
        state: entity.state,
      };
    })
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'scene' ? -1 : 1;
      }

      return left.name.localeCompare(right.name, locale, { sensitivity: 'base' });
    });

  return { automations, quickActions };
}
