import { type AuthSession, toAuthCompatibleSession } from '@navet/app/auth/types';
import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import { integrationStore } from '@navet/app/stores/integration-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import type { HomeAssistantPanelHass } from './home-assistant-panel-adapter';

export async function bootstrapIntegrationSession(session: AuthSession): Promise<void> {
  integrationStore.getState().setIntegrationUser(session.user ?? null);
  const contract = getRegisteredProviderContract(session.providerId);
  const providerSession = toAuthCompatibleSession(session);
  if (providerSession) {
    await contract.initializeSession?.(providerSession);
  }
}

export function attachIntegrationRuntimeBridge(
  providerId: IntegrationProviderId,
  bridge: HomeAssistantPanelHass
): void {
  getRegisteredProviderContract(providerId).attachRuntimeBridge?.(bridge);
}

export function teardownIntegrationSession(providerId: AuthSession['providerId'] | null): void {
  if (providerId) {
    getRegisteredProviderContract(providerId).teardownSession?.();
  }
  integrationStore.getState().setIntegrationUser(null);
}
