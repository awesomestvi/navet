import type { HassEntities } from 'home-assistant-js-websocket';
import { useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { integrationTaskService } from '@/app/services/integration-task.service';
import type { IntegrationStore } from '@/app/stores/integration-store';
import type { TaskRoutineData } from '../types';
import { mapTaskRoutines } from '../utils/map-task-routines';

export function useTaskRoutines(): TaskRoutineData {
  const { locale } = useI18n();
  const selectTaskEntities = useCallback((state: IntegrationStore): HassEntities | null => {
    const snapshot = integrationTaskService.selectTaskRuntimeSnapshot(state);
    if (!snapshot.entities) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(snapshot.entities).filter(
        ([entityId]) =>
          entityId.startsWith('automation.') ||
          entityId.startsWith('scene.') ||
          entityId.startsWith('script.')
      )
    );
  }, []);
  const entities = useHomeAssistant(selectTaskEntities, shallow);
  const areas = useHomeAssistant(
    (state) => integrationTaskService.selectTaskRuntimeSnapshot(state).areas
  );
  const deviceRegistry = useHomeAssistant(
    (state) => integrationTaskService.selectTaskRuntimeSnapshot(state).deviceRegistry
  );
  const entityRegistry = useHomeAssistant(
    (state) => integrationTaskService.selectTaskRuntimeSnapshot(state).entityRegistry
  );

  return useMemo(
    () =>
      mapTaskRoutines({
        entities,
        areas,
        deviceRegistry,
        entityRegistry,
        locale,
      }),
    [areas, deviceRegistry, entities, entityRegistry, locale]
  );
}
