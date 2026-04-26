import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { useAuthStore } from '../auth-store';
import { useConfigStore } from '../config-store';
import { homeAssistantStore } from '../home-assistant-store';

describe('useAuthStore', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('logs in and syncs config state', async () => {
    await expect(
      useAuthStore.getState().login('https://ha.example.com/', '  token  ')
    ).resolves.toBe(true);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().config).toEqual({
      url: 'https://ha.example.com',
      token: 'token',
    });
    expect(useConfigStore.getState().config).toEqual({
      url: 'https://ha.example.com',
      token: 'token',
    });
  });

  it('logs out and disconnects Home Assistant', async () => {
    const disconnectSpy = vi.spyOn(homeAssistantStore.getState(), 'disconnect');
    await useAuthStore.getState().login('https://ha.example.com', 'token');

    useAuthStore.getState().logout();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useConfigStore.getState().isConfigured).toBe(false);
  });
});
