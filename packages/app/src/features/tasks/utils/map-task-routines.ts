import type {
  PlatformTaskDeviceReference,
  PlatformTaskEntityMap,
  PlatformTaskEntityReference,
  PlatformTaskRoomReference,
} from '@navet/app/platform/provider-feature-models';
import type { SceneDevice } from '@navet/app/types/device.types';
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

export function mapDeviceSceneRoutines(
  scenes: SceneDevice[],
  locale?: string
): QuickActionRoutine[] {
  return scenes
    .filter((scene) => scene.providerId !== 'home_assistant')
    .map(
      (scene): QuickActionRoutine => ({
        id: scene.canonicalId ?? scene.id,
        type: 'scene',
        name: scene.name,
        room: scene.room,
        state: 'off',
      })
    )
    .sort((left, right) => left.name.localeCompare(right.name, locale, { sensitivity: 'base' }));
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
