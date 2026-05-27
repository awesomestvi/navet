import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import type { AuthSession } from '@/auth/types';
import { isHomeyAuthSession } from '@/auth/types';
import { homeyService } from './homey.service';
import { ensureHomeyApiClientConfigured } from './homey-api-client.service';

export async function bootstrapIntegrationSession(session: AuthSession): Promise<void> {
  if (isHomeyAuthSession(session)) {
    ensureHomeyApiClientConfigured();
    homeAssistantStore.setState({ user: session.user ?? null });
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
    homeAssistantStore.setState({ user: null });
    homeyService.resetSnapshot();
  }
}
