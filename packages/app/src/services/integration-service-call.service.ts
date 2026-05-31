import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationServiceTarget } from '@navet/app/types/integration-service';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { getProviderNativeId } from '../utils/provider-ids';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

export interface IntegrationServiceCallRequest {
  providerId?: IntegrationProviderId;
  entityId?: string;
  domain: string;
  service: string;
  serviceData?: Record<string, unknown>;
  target?: IntegrationServiceTarget;
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
    entityId: normalizeScopedValue(target.entityId),
    areaId: normalizeScopedValue(target.areaId),
    deviceId: normalizeScopedValue(target.deviceId),
  };
}

export async function callIntegrationService({
  providerId,
  entityId,
  domain,
  service,
  serviceData = {},
  target,
}: IntegrationServiceCallRequest): Promise<void> {
  const resolvedProviderId = resolveIntegrationProviderId(entityId, providerId);
  const registration = getProviderRuntimeRegistration(resolvedProviderId);

  if (!registration.invokeService) {
    throw new Error('Service actions are not implemented yet for the current integration');
  }

  await registration.invokeService(domain, service, serviceData, {
    ...normalizeTarget(target),
    ...(entityId ? { entityId: getNativeIntegrationEntityId(entityId) } : {}),
  });
}
