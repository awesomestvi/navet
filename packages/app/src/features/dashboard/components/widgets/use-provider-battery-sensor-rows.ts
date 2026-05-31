import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderEntitySnapshots } from '@navet/app/hooks/use-provider-entity';
import {
  mapBatterySensorRowsFromEntities,
  type PlatformBatterySensorRow,
} from '@navet/app/infrastructure/home-assistant/home-assistant-battery-selectors';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo } from 'react';

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
