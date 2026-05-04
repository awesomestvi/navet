import { useMemo } from 'react';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { AutomationTaskGroup } from '../types';
import { mapAutomationTasks } from '../utils/map-automation-tasks';

export function useTaskAutomationGroups(): AutomationTaskGroup[] {
  const { locale, t } = useI18n();
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);

  const automations = useMemo(
    () =>
      mapAutomationTasks({
        entities,
        areas,
        deviceRegistry,
        entityRegistry,
        locale,
      }),
    [areas, deviceRegistry, entities, entityRegistry, locale]
  );

  return useMemo(
    () => [
      {
        key: 'automations' as const,
        title: t('sections.tasks.automations.title'),
        singularLabel: t('sections.tasks.automations.singular'),
        pluralLabel: t('sections.tasks.automations.plural'),
        tasks: automations,
      },
    ],
    [automations, t]
  );
}
