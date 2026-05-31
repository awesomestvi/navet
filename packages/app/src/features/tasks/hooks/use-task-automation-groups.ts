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

export function useTaskRoutines(): TaskRoutineData {
  const { locale } = useI18n();
  const taskRuntime = useSyncExternalStore(
    integrationTaskService.subscribeTaskRuntimeSnapshot,
    integrationTaskService.getTaskRuntimeSnapshot,
    integrationTaskService.getTaskRuntimeSnapshot
  );

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
