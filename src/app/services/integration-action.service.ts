import type { NavetActionIntent } from '@/app/core/navet';
import type { IntegrationProviderId } from '../types/provider';
import { getProviderNativeId } from '../utils/provider-ids';
import { resolveIntegrationProviderId } from './integration-provider-context.service';
import {
  getIntegrationProviderAdapter,
  getIntegrationProviderContract,
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

export interface DispatchPlatformActionRequest {
  targetId: string;
  providerId?: IntegrationProviderId;
  domain: string;
  service: string;
  payload?: Record<string, unknown>;
  target?: Omit<IntegrationServiceTarget, 'entity_id'>;
}

export async function dispatchAction(intent: NavetActionIntent): Promise<void> {
  const contract = getIntegrationProviderContract(intent.providerId);
  await contract.dispatchAction(intent);
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
  return resolveIntegrationProviderId(entityId, providerId);
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
  await dispatchAction({
    targetId: `${resolvedProviderId}:service`,
    providerId: resolvedProviderId,
    actionId: 'service',
    payload: {
      domain,
      service,
      serviceData,
      target: normalizeTarget(target),
    },
  });
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
  await dispatchAction({
    targetId: entityId,
    providerId: resolvedProviderId,
    actionId: 'service',
    payload: {
      domain,
      service,
      serviceData,
      target: {
        ...target,
        entity_id: getProviderNativeId(entityId),
      },
    },
  });
}

export async function dispatchPlatformAction({
  targetId,
  providerId,
  domain,
  service,
  payload,
  target,
}: DispatchPlatformActionRequest): Promise<void> {
  await dispatchEntityAction({
    entityId: targetId,
    providerId,
    domain,
    service,
    serviceData: payload,
    target,
  });
}
