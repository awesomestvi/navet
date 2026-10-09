import { type AuthSession, toAuthCompatibleSession } from '@navet/app/auth/types';
import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import { integrationStore } from '@navet/app/stores/integration-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { setOpenHABRuntimeError } from '@navet/provider-openhab';
import type { HomeAssistantPanelHass } from './home-assistant-panel-adapter';

const bootstrapGenerations: Partial<Record<IntegrationProviderId, number>> = {};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return 'Unable to initialize provider session';
}

export async function bootstrapIntegrationSession(session: AuthSession): Promise<void> {
  const generation = (bootstrapGenerations[session.providerId] ?? 0) + 1;
  bootstrapGenerations[session.providerId] = generation;
  integrationStore.getState().setIntegrationUser(session.user ?? null);
  const contract = getRegisteredProviderContract(session.providerId);
  const providerSession = toAuthCompatibleSession(session);
  if (providerSession) {
    try {
      await contract.initializeSession?.(providerSession);
    } catch (error) {
      if (
        session.providerId === 'openhab' &&
        bootstrapGenerations[session.providerId] === generation
      ) {
        setOpenHABRuntimeError(getErrorMessage(error));
      }
      throw error;
    }
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
    bootstrapGenerations[providerId] = (bootstrapGenerations[providerId] ?? 0) + 1;
    getRegisteredProviderContract(providerId).teardownSession?.();
  }
  integrationStore.getState().setIntegrationUser(null);
}
