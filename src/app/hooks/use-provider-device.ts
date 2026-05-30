import type { NavetEntity } from '@navet/core/types';
import { integrationSelectors } from '@/app/stores/selectors';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { useIntegrationStore } from './use-integration-store';

function getLookupProviderIds(
  entityId: string,
  currentProviderId: IntegrationProviderId
): IntegrationProviderId[] {
  const scopedId = parseProviderScopedId(entityId);
  if (scopedId) {
    return [scopedId.providerId];
  }

  return currentProviderId === 'home_assistant'
    ? ['home_assistant']
    : [currentProviderId, 'home_assistant'];
}

export function useProviderEntityModel(entityId: string): NavetEntity | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const lookupProviderIds = getLookupProviderIds(entityId, currentProviderId);

  return useIntegrationStore((state) => {
    for (const providerId of lookupProviderIds) {
      const entity = integrationSelectors.providerEntityByLookup(providerId, entityId)(state);
      if (entity) {
        return entity;
      }
    }

    return null;
  }, Object.is);
}
