import type {
  PlatformEntityHistoryRequest,
  PlatformEntityHistorySeries,
  PlatformMessageClient,
  PlatformStatisticsHistoryRequest,
  PlatformStatisticsHistorySeries,
} from '@navet/app/platform/provider-feature-models';
import type { ProviderHistoryFeatureService } from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  getCurrentIntegrationProviderIdFromStore,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

export const integrationHistoryService: ProviderHistoryFeatureService = {
  getMessageClient: () => {
    const service = getProviderRuntimeRegistration(
      getCurrentIntegrationProviderIdFromStore()
    ).historyFeatureService;
    return service?.getMessageClient() ?? null;
  },
};

export function getIntegrationHistoryMessageClient(
  entityIdOrProviderId?: string | IntegrationProviderId
): PlatformMessageClient | null {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  return service?.getMessageClient() ?? null;
}

export async function getIntegrationEntityHistory(
  request: PlatformEntityHistoryRequest
): Promise<PlatformEntityHistorySeries | null> {
  const providerId = resolveIntegrationProviderId(request.entityId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  if (!service?.getEntityHistory) {
    return null;
  }

  const nativeEntityId = request.entityId.replace(/^[^:]+:/, '');
  const result = await service.getEntityHistory({ ...request, entityId: nativeEntityId });
  return { ...result, entityId: request.entityId };
}

export async function getIntegrationStatisticsHistory(
  request: PlatformStatisticsHistoryRequest
): Promise<PlatformStatisticsHistorySeries | null> {
  if (request.entityIds.length === 0) {
    return {};
  }

  const providerId = resolveIntegrationProviderId(request.entityIds[0]);
  if (request.entityIds.some((entityId) => resolveIntegrationProviderId(entityId) !== providerId)) {
    throw new Error('Statistics history entities must belong to the same provider');
  }

  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  if (!service?.getStatisticsHistory) {
    return null;
  }

  const nativeToCanonical = new Map<string, string>();
  for (const entityId of request.entityIds) {
    nativeToCanonical.set(entityId.replace(/^[^:]+:/, ''), entityId);
  }
  const nativeEntityIds = [...nativeToCanonical.keys()];
  const nativeUnits = request.units
    ? Object.fromEntries(
        [...nativeToCanonical.entries()].flatMap(([nativeEntityId, canonicalEntityId]) => {
          const unit = request.units?.[canonicalEntityId];
          return unit ? [[nativeEntityId, unit]] : [];
        })
      )
    : undefined;
  const result = await service.getStatisticsHistory({
    ...request,
    entityIds: nativeEntityIds,
    ...(nativeUnits && Object.keys(nativeUnits).length > 0 ? { units: nativeUnits } : {}),
  });

  const normalized: PlatformStatisticsHistorySeries = {};
  for (const nativeEntityId of nativeEntityIds) {
    const canonicalEntityId = nativeToCanonical.get(nativeEntityId);
    if (canonicalEntityId) {
      normalized[canonicalEntityId] = result[nativeEntityId] ?? [];
    }
  }
  return normalized;
}

export function supportsIntegrationStatisticsHistory(
  entityIdOrProviderId?: string | IntegrationProviderId
): boolean {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  if (!service) {
    return false;
  }

  if (
    typeof service.supportsStatisticsHistory === 'function' &&
    typeof entityIdOrProviderId === 'string'
  ) {
    return service.supportsStatisticsHistory(entityIdOrProviderId.replace(/^[^:]+:/, ''));
  }

  return service.getMessageClient() !== null;
}

export function supportsIntegrationEnergyStatistics(
  entityIdOrProviderId?: string | IntegrationProviderId
): boolean {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  if (!service) {
    return false;
  }

  if (
    typeof service.supportsEnergyStatistics === 'function' &&
    typeof entityIdOrProviderId === 'string'
  ) {
    return service.supportsEnergyStatistics(entityIdOrProviderId.replace(/^[^:]+:/, ''));
  }

  return service.getMessageClient() !== null;
}
