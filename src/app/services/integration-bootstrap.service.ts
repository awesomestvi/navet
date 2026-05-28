import { integrationStore } from '@/app/stores/integration-store';
import type { AuthSession } from '@/auth/types';
import { isHomeyAuthSession } from '@/auth/types';
import { homeyService } from './homey.service';
import { ensureHomeyApiClientConfigured } from './homey-api-client.service';

export async function bootstrapIntegrationSession(session: AuthSession): Promise<void> {
  integrationStore.getState().setIntegrationUser(session.user ?? null);

  if (isHomeyAuthSession(session)) {
    ensureHomeyApiClientConfigured();
    if (session.homeySnapshot) {
      homeyService.replaceSnapshot({
        connected: session.homeySnapshot.connected,
        devices: session.homeySnapshot.devices,
        zones: session.homeySnapshot.zones,
      });
      return;
    }

    await homeyService.loadSnapshot();
  }
}

export function teardownIntegrationSession(providerId: AuthSession['providerId'] | null): void {
  if (providerId === 'homey') {
    homeyService.resetSnapshot();
  }

  integrationStore.getState().setIntegrationUser(null);
}
