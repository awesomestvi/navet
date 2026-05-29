import {
  getProviderFeatureMatrix,
  getProviderRuntimeRegistration,
  hasProviderCapability,
  listProviderRuntimeRegistrations,
} from '@navet/app/provider-runtime-registry';
import type {
  PlatformCameraStream,
  PlatformCameraStreamType,
} from '@/app/platform/provider-feature-models';
import { integrationSessionRuntime } from '@/auth/integration-session-runtime';
import {
  INTEGRATION_PROVIDER_IDS,
  INTEGRATION_PROVIDERS,
  type IntegrationProviderDefinition,
  type IntegrationProviderId,
} from '../types/provider';
import { getCurrentIntegrationProviderIdFromStore } from './integration-provider-context.service';

export function getCurrentIntegrationSession() {
  return integrationSessionRuntime.getSession();
}

export function getCurrentIntegrationProviderId(): IntegrationProviderId {
  return getCurrentIntegrationProviderIdFromStore();
}

export function getCurrentIntegrationProvider(): IntegrationProviderDefinition {
  return INTEGRATION_PROVIDERS[getCurrentIntegrationProviderId()];
}

export function listSupportedIntegrationProviders(): IntegrationProviderDefinition[] {
  return Object.values(INTEGRATION_PROVIDERS);
}

export function listImplementedIntegrationProvidersForRuntime(): IntegrationProviderDefinition[] {
  return INTEGRATION_PROVIDER_IDS.filter(
    (providerId) =>
      getProviderRuntimeRegistration(providerId).implementationStatus === 'implemented'
  ).map((providerId) => INTEGRATION_PROVIDERS[providerId]);
}

export function listIntegrationRuntimeAdapters() {
  const registrations = listProviderRuntimeRegistrations();
  return INTEGRATION_PROVIDER_IDS.map((providerId, index) => ({
    provider: INTEGRATION_PROVIDERS[providerId],
    ...registrations[index],
  }));
}

export function getCurrentIntegrationFeatureMatrix() {
  return getProviderFeatureMatrix(getCurrentIntegrationProviderId());
}

export async function signCurrentIntegrationPath(path: string, expiresSeconds?: number) {
  return await getCurrentIntegrationSignedPath(path, expiresSeconds);
}

export async function getCurrentIntegrationSignedPath(path: string, expiresSeconds?: number) {
  const providerId = getCurrentIntegrationProviderId();
  const adapter = getProviderRuntimeRegistration(providerId);
  if (!hasProviderCapability(providerId, 'pathSigning')) {
    throw new Error(
      `Path signing is not implemented yet for provider ${INTEGRATION_PROVIDERS[providerId].label}`
    );
  }

  if (!adapter.signPath) {
    throw new Error(`${INTEGRATION_PROVIDERS[providerId].label} does not support signed paths`);
  }

  return await adapter.signPath(path, expiresSeconds);
}

export async function getCurrentIntegrationCameraStream(
  entityId: string,
  format: PlatformCameraStreamType
): Promise<PlatformCameraStream> {
  return await getCurrentIntegrationCameraStreamUrl(entityId, format);
}

export async function getCurrentIntegrationCameraStreamUrl(
  entityId: string,
  format: PlatformCameraStreamType
): Promise<PlatformCameraStream> {
  const providerId = getCurrentIntegrationProviderId();
  const adapter = getProviderRuntimeRegistration(providerId);
  if (!hasProviderCapability(providerId, 'cameraStreams')) {
    throw new Error(
      `Camera streams are not implemented yet for provider ${INTEGRATION_PROVIDERS[providerId].label}`
    );
  }

  if (!adapter.getCameraStream) {
    throw new Error(`${INTEGRATION_PROVIDERS[providerId].label} does not support camera streams`);
  }

  return await adapter.getCameraStream(entityId, format);
}
