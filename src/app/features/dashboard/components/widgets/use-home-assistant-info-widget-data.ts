import { useMemo } from 'react';
import {
  buildAvailableSensorOptions,
  resolveSensorReadings,
  type SensorReading,
} from '@/app/features/sensors';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';

export function useHomeAssistantInfoWidgetData(
  sensorEntityIds: string[],
  options: {
    includeBinarySensors?: boolean;
    use24HourTime: boolean;
  }
): {
  availableSensors: ReturnType<typeof buildAvailableSensorOptions>;
  currentSensors: SensorReading[];
} {
  const { locale } = useI18n();
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const formatOptions = useMemo(
    () => ({ locale, use24HourTime: options.use24HourTime }),
    [locale, options.use24HourTime]
  );

  const availableSensors = useMemo(
    () =>
      buildAvailableSensorOptions({
        entities,
        areas,
        deviceRegistry,
        entityRegistry,
        formatOptions,
        includeBinarySensors: options.includeBinarySensors,
      }),
    [areas, deviceRegistry, entities, entityRegistry, formatOptions, options.includeBinarySensors]
  );

  const currentSensors = useMemo(
    () =>
      resolveSensorReadings({
        entities,
        sensorEntityIds,
        formatOptions,
      }),
    [entities, formatOptions, sensorEntityIds]
  );

  return {
    availableSensors,
    currentSensors,
  };
}
