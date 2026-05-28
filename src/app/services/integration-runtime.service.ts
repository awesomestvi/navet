import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderDefinition,
  type IntegrationProviderId,
} from '../types/provider';
import type { HomeAssistantCameraStreamType } from './home-assistant.service';
import {
  getIntegrationProviderAdapter,
  getIntegrationProviderFeatureMatrix,
  listImplementedIntegrationProviders,
  listIntegrationProviderAdapters,
  requireIntegrationProviderCapability,
} from './integration-registry.service';

export function getCurrentIntegrationSession() {
  return authSessionManager.getSession();
}

export function getCurrentIntegrationProviderId(): IntegrationProviderId {
  return authSessionManager.getSnapshot().providerId;
}

export function getCurrentIntegrationProvider(): IntegrationProviderDefinition {
  return INTEGRATION_PROVIDERS[getCurrentIntegrationProviderId()];
}

export function listSupportedIntegrationProviders(): IntegrationProviderDefinition[] {
  return Object.values(INTEGRATION_PROVIDERS);
}

export function listImplementedIntegrationProvidersForRuntime(): IntegrationProviderDefinition[] {
  return listImplementedIntegrationProviders();
}

export function listIntegrationRuntimeAdapters() {
  return listIntegrationProviderAdapters();
}

export function getCurrentIntegrationFeatureMatrix() {
  return getIntegrationProviderFeatureMatrix(getCurrentIntegrationProviderId());
}

export async function signCurrentIntegrationPath(path: string, expiresSeconds?: number) {
  const adapter = getIntegrationProviderAdapter(getCurrentIntegrationProviderId());
  requireIntegrationProviderCapability(adapter, 'pathSigning');

  if (!adapter.signPath) {
    throw new Error(`${adapter.provider.label} does not support signed paths`);
  }

  return await adapter.signPath(path, expiresSeconds);
}

export async function getCurrentIntegrationCameraStream(
  entityId: string,
  format: HomeAssistantCameraStreamType
) {
  const adapter = getIntegrationProviderAdapter(getCurrentIntegrationProviderId());
  requireIntegrationProviderCapability(adapter, 'cameraStreams');

  if (!adapter.getCameraStream) {
    throw new Error(`${adapter.provider.label} does not support camera streams`);
  }

  return await adapter.getCameraStream(entityId, format);
}
