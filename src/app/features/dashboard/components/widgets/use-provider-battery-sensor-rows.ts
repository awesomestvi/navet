import { useMemo } from 'react';
import { useIntegrationStore } from '@/app/hooks';
import { useProviderEntitySnapshots } from '@/app/hooks/use-provider-entity';
import {
  mapBatterySensorRowsFromEntities,
  type PlatformBatterySensorRow,
} from '@/app/infrastructure/home-assistant/home-assistant-battery-selectors';
import { integrationSelectors } from '@/app/stores/selectors';

export type ProviderBatterySensorRow = PlatformBatterySensorRow;

function selectEmptyBatteryRows(): ProviderBatterySensorRow[] {
  return [];
}

export function useProviderBatterySensorRows(): ProviderBatterySensorRow[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const entities = useProviderEntitySnapshots({
    providerId: currentProviderId,
    enabled: currentProviderId === 'home_assistant',
  });

  return useMemo(
    () =>
      currentProviderId === 'home_assistant'
        ? mapBatterySensorRowsFromEntities(entities)
        : selectEmptyBatteryRows(),
    [currentProviderId, entities]
  );
}
