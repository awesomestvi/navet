import { INTEGRATION_PROVIDERS, type IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from './provider-ids';

function getProviderLabel(providerId: IntegrationProviderId): string {
  return INTEGRATION_PROVIDERS[providerId].label;
}

export function getProviderEntityTypeLabel(
  entityId?: string,
  entityType?: string,
  includeProvider = true
): string | undefined {
  const normalizedEntityType = entityType?.trim();
  if (!normalizedEntityType) {
    return normalizedEntityType || undefined;
  }

  if (!includeProvider) {
    return normalizedEntityType;
  }

  const providerId = entityId ? parseProviderScopedId(entityId)?.providerId : null;
  if (!providerId) {
    return normalizedEntityType;
  }

  return `${getProviderLabel(providerId)}: ${normalizedEntityType}`;
}
