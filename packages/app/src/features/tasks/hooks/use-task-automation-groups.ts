import { useI18n, useIntegrationStore } from '@navet/app/hooks';
import { useDeviceCollectionsByKeys } from '@navet/app/hooks/use-devices';
import type {
  PlatformTaskEntityMap,
  PlatformTaskRuntimeSnapshot,
} from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo, useSyncExternalStore } from 'react';
import type { TaskRoutineData } from '../types';
import { mapDeviceSceneRoutines, mapTaskRoutines } from '../utils/map-task-routines';
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
const ROUTINE_COLLECTION_KEYS = ['scenes'] as const;

export function useTaskRoutines(options?: { enabled?: boolean }): TaskRoutineData {
  const { locale } = useI18n();
  const enabled = options?.enabled ?? true;
  const selectedProviderIds = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const { scenes } = useDeviceCollectionsByKeys(ROUTINE_COLLECTION_KEYS, { enabled });
  const taskService = selectedProviderIds.includes('home_assistant')
    ? getProviderRuntimeRegistration('home_assistant').taskFeatureService
    : undefined;
  const taskRuntime = useSyncExternalStore(
    enabled && taskService ? taskService.subscribeTaskRuntimeSnapshot : () => () => {},
    enabled && taskService ? taskService.getTaskRuntimeSnapshot : () => EMPTY_TASK_RUNTIME_SNAPSHOT,
    enabled && taskService ? taskService.getTaskRuntimeSnapshot : () => EMPTY_TASK_RUNTIME_SNAPSHOT
  );

  const entities = useMemo(
    (): PlatformTaskEntityMap | null =>
      enabled
        ? filterTaskEntities(
            taskRuntime.entities,
            (entityId) =>
              entityId.startsWith('automation.') ||
              entityId.startsWith('scene.') ||
              entityId.startsWith('script.')
          )
        : null,
    [enabled, taskRuntime.entities]
  );
  const taskRuntimeMetadata = useMemo(
    (): Pick<PlatformTaskRuntimeSnapshot, 'rooms' | 'devices' | 'entityReferences'> => ({
      rooms: taskRuntime.rooms,
      devices: taskRuntime.devices,
      entityReferences: taskRuntime.entityReferences,
    }),
    [taskRuntime.devices, taskRuntime.entityReferences, taskRuntime.rooms]
  );

  const legacyRoutines = useMemo(
    () =>
      enabled
        ? mapTaskRoutines({
            entities,
            rooms: taskRuntimeMetadata.rooms,
            devices: taskRuntimeMetadata.devices,
            entityReferences: taskRuntimeMetadata.entityReferences,
            locale,
          })
        : EMPTY_TASK_ROUTINE_DATA,
    [
      enabled,
      entities,
      locale,
      taskRuntimeMetadata.devices,
      taskRuntimeMetadata.entityReferences,
      taskRuntimeMetadata.rooms,
    ]
  );
  return useMemo(
    () =>
      enabled
        ? {
            automations: legacyRoutines.automations,
            quickActions: [
              ...legacyRoutines.quickActions,
              ...mapDeviceSceneRoutines(scenes, locale),
            ].sort((left, right) =>
              left.name.localeCompare(right.name, locale, { sensitivity: 'base' })
            ),
          }
        : EMPTY_TASK_ROUTINE_DATA,
    [enabled, legacyRoutines, scenes, locale]
  );
}
