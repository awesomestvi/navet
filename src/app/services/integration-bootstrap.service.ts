import { integrationStore } from '@/app/stores/integration-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { AuthSession } from '@/auth/types';
import type { HomeAssistantPanelHass } from './home-assistant-panel-adapter';
import { getIntegrationProviderContract } from './integration-registry.service';

export async function bootstrapIntegrationSession(session: AuthSession): Promise<void> {
  integrationStore.getState().setIntegrationUser(session.user ?? null);
  const contract = getIntegrationProviderContract(session.providerId);
  await contract.initializeSession?.(session);
}

export function attachIntegrationRuntimeBridge(
  providerId: IntegrationProviderId,
  bridge: HomeAssistantPanelHass
): void {
  getIntegrationProviderContract(providerId).attachRuntimeBridge?.(bridge);
}

export function teardownIntegrationSession(providerId: AuthSession['providerId'] | null): void {
  if (providerId) {
    getIntegrationProviderContract(providerId).teardownSession?.();
  }
  integrationStore.getState().setIntegrationUser(null);
}
