import { integrationStore } from '@navet/app/stores/integration-store';
import { type IntegrationProviderId, isIntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';

export function getCurrentIntegrationProviderIdFromStore(): IntegrationProviderId {
  return integrationStore.getState().currentProviderId;
}

export function resolveIntegrationProviderId(
  entityIdOrProviderId?: string | IntegrationProviderId,
  fallbackProviderId?: IntegrationProviderId
): IntegrationProviderId {
  if (fallbackProviderId) {
    return fallbackProviderId;
  }

  if (entityIdOrProviderId) {
    const scoped = parseProviderScopedId(entityIdOrProviderId);
    if (scoped) {
      return scoped.providerId;
    }

    if (isIntegrationProviderId(entityIdOrProviderId)) {
      return entityIdOrProviderId;
    }
  }

  return getCurrentIntegrationProviderIdFromStore();
}

export function getNativeIntegrationEntityId(entityId: string): string {
  return parseProviderScopedId(entityId)?.nativeId ?? entityId;
}
