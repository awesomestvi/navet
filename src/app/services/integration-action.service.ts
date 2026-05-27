import type { IntegrationProviderId } from '../types/provider';
import { getProviderNativeId, parseProviderScopedId } from '../utils/provider-ids';
import {
  getIntegrationProviderAdapter,
  type IntegrationServiceTarget,
  requireIntegrationProviderCapability,
} from './integration-registry.service';

export interface DispatchServiceActionRequest {
  providerId?: IntegrationProviderId;
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
  target?: IntegrationServiceTarget;
}

export interface DispatchEntityActionRequest {
  providerId?: IntegrationProviderId;
  entityId: string;
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
  target?: Omit<IntegrationServiceTarget, 'entity_id'>;
}

function normalizeScopedValue(value: string | string[] | undefined): string | string[] | undefined {
  if (typeof value === 'string') {
    return getProviderNativeId(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => getProviderNativeId(entry));
  }

  return value;
}

function normalizeTarget(target?: IntegrationServiceTarget): IntegrationServiceTarget | undefined {
  if (!target) {
    return undefined;
  }

  return {
    entity_id: normalizeScopedValue(target.entity_id),
    area_id: normalizeScopedValue(target.area_id),
    device_id: normalizeScopedValue(target.device_id),
  };
}

function resolveProviderId(
  providerId: IntegrationProviderId | undefined,
  entityId?: string
): IntegrationProviderId {
  if (providerId) {
    return providerId;
  }

  if (entityId) {
    return parseProviderScopedId(entityId)?.providerId ?? 'home_assistant';
  }

  return 'home_assistant';
}

export async function dispatchServiceAction({
  providerId,
  domain,
  service,
  serviceData = {},
  target,
}: DispatchServiceActionRequest): Promise<void> {
  const resolvedProviderId = resolveProviderId(providerId);
  const adapter = getIntegrationProviderAdapter(resolvedProviderId);
  requireIntegrationProviderCapability(adapter, 'serviceActions');

  if (!adapter.callService) {
    throw new Error(`${adapter.provider.label} does not support integration service actions`);
  }

  await adapter.callService(domain, service, serviceData, normalizeTarget(target));
}

export async function dispatchEntityAction({
  providerId,
  entityId,
  domain,
  service,
  serviceData = {},
  target,
}: DispatchEntityActionRequest): Promise<void> {
  const resolvedProviderId = resolveProviderId(providerId, entityId);

  await dispatchServiceAction({
    providerId: resolvedProviderId,
    domain,
    service,
    serviceData,
    target: {
      ...target,
      entity_id: getProviderNativeId(entityId),
    },
  });
}
