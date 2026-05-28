import { useIntegrationStore } from '@/app/hooks';
import { integrationSelectors } from '@/app/stores/selectors';
import {
  type HomeAssistantInfoWidgetDataOptions as InternalInfoWidgetDataOptions,
  type HomeAssistantInfoWidgetDataResult as InternalInfoWidgetDataResult,
  useHomeAssistantInfoWidgetData,
} from './use-home-assistant-info-widget-data';

export type ProviderInfoWidgetDataOptions = InternalInfoWidgetDataOptions;
export type ProviderInfoWidgetDataResult = InternalInfoWidgetDataResult;

export function useProviderInfoWidgetData(
  sensorEntityIds: string[],
  options: ProviderInfoWidgetDataOptions
): ProviderInfoWidgetDataResult {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);

  return useHomeAssistantInfoWidgetData(sensorEntityIds, {
    ...options,
    enabled: currentProviderId === 'home_assistant',
  });
}
