import { integrationStore } from '@/app/stores/integration-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return value === 'home_assistant' || value === 'homey' || value === 'openhab';
}

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
