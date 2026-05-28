import { useMemo } from 'react';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { buildUpsDeviceOptions } from './ups-widget-data';

export function useHomeAssistantUpsWidgetData(options: { use24HourTime: boolean }) {
  const { locale } = useI18n();
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const formatOptions = useMemo(
    () => ({ locale, use24HourTime: options.use24HourTime }),
    [locale, options.use24HourTime]
  );

  const devices = useMemo(
    () =>
      buildUpsDeviceOptions({
        entities,
        areas,
        deviceRegistry,
        entityRegistry,
        formatOptions,
      }),
    [areas, deviceRegistry, entities, entityRegistry, formatOptions]
  );

  return {
    devices,
    entities,
    formatOptions,
  };
}
