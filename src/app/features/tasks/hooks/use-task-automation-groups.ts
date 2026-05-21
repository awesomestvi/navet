import type { HassEntities } from 'home-assistant-js-websocket';
import { useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { TaskRoutineData } from '../types';
import { mapTaskRoutines } from '../utils/map-task-routines';

export function useTaskRoutines(): TaskRoutineData {
  const { locale } = useI18n();
  const selectTaskEntities = useCallback((state: HomeAssistantStore): HassEntities | null => {
    if (!state.entities) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(state.entities).filter(
        ([entityId]) =>
          entityId.startsWith('automation.') ||
          entityId.startsWith('scene.') ||
          entityId.startsWith('script.')
      )
    );
  }, []);
  const entities = useHomeAssistant(selectTaskEntities, shallow);
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);

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
