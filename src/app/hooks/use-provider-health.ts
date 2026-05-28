import { useMemo } from 'react';
import type { ProviderHealth } from '@/app/platform/types';
import type { IntegrationProviderId } from '@/app/types/provider';
import { integrationSelectors } from '../stores/selectors';
import { useIntegrationStore } from './use-integration-store';

export function useProviderHealth(providerId: IntegrationProviderId): ProviderHealth;
export function useProviderHealth(): ProviderHealth[];
export function useProviderHealth(
  providerId?: IntegrationProviderId
): ProviderHealth | ProviderHealth[] {
  const providerHealth = useIntegrationStore(integrationSelectors.providerHealth);

  return useMemo(() => {
    if (providerId) {
      return providerHealth[providerId];
    }

    return Object.values(providerHealth);
  }, [providerHealth, providerId]);
}
