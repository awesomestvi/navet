import type { ProviderHealth } from '@navet/app/platform/types';
import type { IntegrationStore } from '@navet/app/stores/integration-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useIntegrationStore } from './use-integration-store';

export function useProviderHealth(providerId: IntegrationProviderId): ProviderHealth;
export function useProviderHealth(): ProviderHealth[];
export function useProviderHealth(
  providerId?: IntegrationProviderId
): ProviderHealth | ProviderHealth[] {
  const selectHealth = useMemo<(state: IntegrationStore) => ProviderHealth | ProviderHealth[]>(
    () =>
      providerId
        ? (state) => state.providerHealth[providerId]
        : (state) => Object.values(state.providerHealth),
    [providerId]
  );

  return useIntegrationStore(selectHealth, shallow);
}
