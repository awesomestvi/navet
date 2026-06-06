import {
  getProviderRuntimeRegistration,
  hasProviderFeature,
} from '@navet/app/provider-runtime-registry';
import type { IntegrationProviderFeature } from '@navet/app/provider-runtime-types';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  getCurrentIntegrationProviderIdFromStore,
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

type Registration = ReturnType<typeof getProviderRuntimeRegistration>;

type FeatureServiceResolverOptions<Service> = {
  entityId?: string;
  providerId?: IntegrationProviderId;
  feature: IntegrationProviderFeature;
  getService: (registration: Registration) => Service | null | undefined;
  unsupportedMessage: string;
  missingMessage: string;
};

type ResolvedFeatureService<Service> = {
  nativeEntityId: string | null;
  providerId: IntegrationProviderId;
  service: Service;
};

function resolveProviderId(entityId?: string, providerId?: IntegrationProviderId) {
  return resolveIntegrationProviderId(entityId, providerId);
}

export function resolveCurrentProviderService<Service>(
  options: Omit<FeatureServiceResolverOptions<Service>, 'entityId' | 'providerId'> & {
    providerId?: IntegrationProviderId;
  }
): ResolvedFeatureService<Service> {
  return resolveProviderFeatureService({
    ...options,
    providerId: options.providerId ?? getCurrentIntegrationProviderIdFromStore(),
  });
}

export function resolveProviderService<Service>(options: {
  entityId?: string;
  providerId?: IntegrationProviderId;
  getService: (registration: Registration) => Service | null | undefined;
  missingMessage: string;
}): ResolvedFeatureService<Service> {
  const providerId = resolveProviderId(options.entityId, options.providerId);
  const service = options.getService(getProviderRuntimeRegistration(providerId));
  if (!service) {
    throw new Error(options.missingMessage);
  }

  return {
    nativeEntityId: options.entityId ? getNativeIntegrationEntityId(options.entityId) : null,
    providerId,
    service,
  };
}

export function resolveProviderFeatureService<Service>(
  options: FeatureServiceResolverOptions<Service>
): ResolvedFeatureService<Service> {
  const providerId = resolveProviderId(options.entityId, options.providerId);

  if (!hasProviderFeature(providerId, options.feature)) {
    throw new Error(options.unsupportedMessage);
  }

  const service = options.getService(getProviderRuntimeRegistration(providerId));
  if (!service) {
    throw new Error(options.missingMessage);
  }

  return {
    nativeEntityId: options.entityId ? getNativeIntegrationEntityId(options.entityId) : null,
    providerId,
    service,
  };
}
