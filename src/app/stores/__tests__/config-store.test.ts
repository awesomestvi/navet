import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { useConfigStore } from '../config-store';

describe('useConfigStore', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('tests a valid Home Assistant connection', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      useConfigStore.getState().testConnection('https://ha.example.com/', 'abc')
    ).resolves.toBe(true);
  });

  it('returns false for invalid URLs or failed requests', async () => {
    await expect(useConfigStore.getState().testConnection('notaurl', 'abc')).resolves.toBe(false);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(
      useConfigStore.getState().testConnection('https://ha.example.com', 'abc')
    ).resolves.toBe(false);
  });

  it('saves normalized config and can clear it', async () => {
    await expect(
      useConfigStore.getState().saveConfig({ url: 'https://ha.example.com/', token: '  abc  ' })
    ).resolves.toBe(true);

    expect(useConfigStore.getState().config).toEqual({
      url: 'https://ha.example.com',
      token: 'abc',
    });

    useConfigStore.getState().clearConfig();
    expect(useConfigStore.getState().config).toBeNull();
    expect(useConfigStore.getState().isConfigured).toBe(false);
  });
});
