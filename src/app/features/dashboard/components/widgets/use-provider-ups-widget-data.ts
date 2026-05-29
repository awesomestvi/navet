import { getProviderFeatureMatrix } from '@navet/app/provider-runtime-registry';
import { useMemo } from 'react';
import { useIntegrationStore } from '@/app/hooks';
import {
  type ProviderUpsWidgetDataResult,
  resolveProviderUpsWidgetData,
} from '@/app/services/integration-energy-widget.service';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHomeAssistantUpsWidgetData } from './use-home-assistant-ups-widget-data';

export interface ProviderUpsWidgetDataOptions {
  use24HourTime: boolean;
}

export function useProviderUpsWidgetData(
  options: ProviderUpsWidgetDataOptions
): ProviderUpsWidgetDataResult {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const providerEntitiesByCanonicalId = useIntegrationStore(
    integrationSelectors.providerEntitiesByCanonicalId
  );
  const supportsProviderEnergyNow = getProviderFeatureMatrix(currentProviderId).energyNow;
  const homeAssistantData = useHomeAssistantUpsWidgetData(options, supportsProviderEnergyNow);

  return useMemo(() => {
    return resolveProviderUpsWidgetData({
      currentProviderId,
      providerEntitiesByCanonicalId,
      homeAssistantData,
    });
  }, [currentProviderId, homeAssistantData, providerEntitiesByCanonicalId]);
}
