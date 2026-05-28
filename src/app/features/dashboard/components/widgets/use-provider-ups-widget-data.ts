import { useIntegrationStore } from '@/app/hooks';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHomeAssistantUpsWidgetData } from './use-home-assistant-ups-widget-data';

export interface ProviderUpsWidgetDataOptions {
  use24HourTime: boolean;
}

export type ProviderUpsWidgetDataResult = ReturnType<typeof useHomeAssistantUpsWidgetData>;

export function useProviderUpsWidgetData(
  options: ProviderUpsWidgetDataOptions
): ProviderUpsWidgetDataResult {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  return useHomeAssistantUpsWidgetData(options, currentProviderId === 'home_assistant');
}
