import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import { integrationStore } from '@/app/stores/integration-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { AuthSession } from '@/auth/types';
import type { HomeAssistantPanelHass } from './home-assistant-panel-adapter';

export async function bootstrapIntegrationSession(session: AuthSession): Promise<void> {
  integrationStore.getState().setIntegrationUser(session.user ?? null);
  const contract = getRegisteredProviderContract(session.providerId);
  await contract.initializeSession?.(session);
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
