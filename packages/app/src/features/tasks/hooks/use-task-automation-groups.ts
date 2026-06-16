import { useI18n } from '@navet/app/hooks';
import type {
  PlatformTaskEntityMap,
  PlatformTaskRuntimeSnapshot,
} from '@navet/app/platform/provider-feature-models';
import { integrationTaskService } from '@navet/app/services/integration-task.service';
import { useMemo, useSyncExternalStore } from 'react';
import type { TaskRoutineData } from '../types';
import { mapTaskRoutines } from '../utils/map-task-routines';
import { filterTaskEntities } from '../utils/task-runtime';

const EMPTY_TASK_RUNTIME_SNAPSHOT: PlatformTaskRuntimeSnapshot = {
  entities: null,
  rooms: [],
  devices: [],
  entityReferences: [],
};

const EMPTY_TASK_ROUTINE_DATA: TaskRoutineData = {
  automations: [],
  quickActions: [],
};

export function useTaskRoutines(options?: { enabled?: boolean }): TaskRoutineData {
  const { locale } = useI18n();
  const enabled = options?.enabled ?? true;
  const taskRuntime = useSyncExternalStore(
    enabled ? integrationTaskService.subscribeTaskRuntimeSnapshot : () => () => {},
    enabled ? integrationTaskService.getTaskRuntimeSnapshot : () => EMPTY_TASK_RUNTIME_SNAPSHOT,
    enabled ? integrationTaskService.getTaskRuntimeSnapshot : () => EMPTY_TASK_RUNTIME_SNAPSHOT
  );

  if (!enabled) {
    return EMPTY_TASK_ROUTINE_DATA;
  }

  const entities = useMemo(
    (): PlatformTaskEntityMap | null =>
      filterTaskEntities(
        taskRuntime.entities,
        (entityId) =>
          entityId.startsWith('automation.') ||
          entityId.startsWith('scene.') ||
          entityId.startsWith('script.')
      ),
    [taskRuntime.entities]
  );
  const taskRuntimeMetadata = useMemo(
    (): Pick<PlatformTaskRuntimeSnapshot, 'rooms' | 'devices' | 'entityReferences'> => ({
      rooms: taskRuntime.rooms,
      devices: taskRuntime.devices,
      entityReferences: taskRuntime.entityReferences,
    }),
    [taskRuntime.devices, taskRuntime.entityReferences, taskRuntime.rooms]
  );

  return useMemo(
    () =>
      mapTaskRoutines({
        entities,
        rooms: taskRuntimeMetadata.rooms,
        devices: taskRuntimeMetadata.devices,
        entityReferences: taskRuntimeMetadata.entityReferences,
        locale,
      }),
    [
      entities,
      locale,
      taskRuntimeMetadata.devices,
      taskRuntimeMetadata.entityReferences,
      taskRuntimeMetadata.rooms,
    ]
  );
}
