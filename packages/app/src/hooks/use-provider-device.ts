import { integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import type { NavetEntity } from '@navet/core/types';
import { shallow } from 'zustand/shallow';
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

/**
 * Subscribes to a bounded set of normalized entities. The returned record is
 * shallow-compared so provider updates outside this set do not rerender the
 * consuming dashboard or rebuild its view model.
 */
export function useProviderEntityModels(entityIds: string[]): Record<string, NavetEntity> {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);

  return useIntegrationStore((state) => {
    const entities: Record<string, NavetEntity> = {};

    for (const entityId of entityIds) {
      for (const providerId of getLookupProviderIds(entityId, currentProviderId)) {
        const entity = integrationSelectors.providerEntityByLookup(providerId, entityId)(state);
        if (entity) {
          entities[entityId] = entity;
          break;
        }
      }
    }

    return entities;
  }, shallow);
}
