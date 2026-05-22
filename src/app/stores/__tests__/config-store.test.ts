import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import { useConfigStore } from '../config-store';

describe('useConfigStore', () => {
  beforeEach(async () => {
    await resetAppStores();
    document.querySelector('base')?.remove();
    window.__NAVET_CONFIG__ = undefined;
    window.history.replaceState(null, '', '/');
  });

  it('tests a valid Home Assistant connection', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      useConfigStore.getState().testConnection('https://ha.example.com/', 'abc')
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith('https://ha.example.com/api/', expect.any(Object));
  });

  it('tests add-on manual login connections through the ingress proxy', async () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
    document.head.append(base);
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://supervisor/core',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      useConfigStore.getState().testConnection('http://supervisor/core', 'abc')
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer abc',
        }),
      })
    );
  });

  it('returns false for invalid URLs or failed requests', async () => {
    await expect(useConfigStore.getState().testConnection('notaurl', 'abc')).resolves.toBe(false);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(
      useConfigStore.getState().testConnection('https://ha.example.com', 'abc')
    ).resolves.toBe(false);
  });

  it('rejects pasted diagnostic text as a token before fetching', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      useConfigStore
        .getState()
        .testConnection(
          'https://ha.example.com',
          'GET http://supervisor/core/api/ net::ERR_NAME_NOT_RESOLVED'
        )
    ).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
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
