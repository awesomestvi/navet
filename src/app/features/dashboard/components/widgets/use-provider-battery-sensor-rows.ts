import { useIntegrationStore } from '@/app/hooks';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import {
  type HaBatterySensorRow,
  haBatterySensorRowsEqual,
  selectBatterySensorRowsFromHa,
} from '@/app/infrastructure/home-assistant/home-assistant-battery-selectors';
import { integrationSelectors } from '@/app/stores/selectors';

export type ProviderBatterySensorRow = HaBatterySensorRow;

function selectEmptyBatteryRows(): ProviderBatterySensorRow[] {
  return [];
}

export function useProviderBatterySensorRows(): ProviderBatterySensorRow[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);

  return useHomeAssistant(
    currentProviderId === 'home_assistant' ? selectBatterySensorRowsFromHa : selectEmptyBatteryRows,
    haBatterySensorRowsEqual
  );
}
