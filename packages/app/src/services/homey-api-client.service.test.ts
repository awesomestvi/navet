import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService } from './homey.service';
import { homeyApiClient } from './homey-api-client.service';
import { teardownIntegrationSession } from './integration-bootstrap.service';

describe('Homey connection availability', () => {
  beforeEach(() => {
    homeyService.resetSnapshot();
    homeyService.setClient(homeyApiClient);
  });

  afterEach(() => {
    homeyService.setClient(null);
    homeyService.resetSnapshot();
    vi.unstubAllGlobals();
  });

  it('reports an unreachable hub and clears the error after the hub responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: 'Unable to load Homey resource' }), {
            status: 502,
          })
      )
    );

    await expect(homeyService.loadSnapshot()).rejects.toThrow(
      'Homey request failed with status 502'
    );
    expect(homeyService.getSnapshot()).toMatchObject({
      connected: false,
      unreachable: true,
      error: 'Homey request failed with status 502',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }))
    );
    await homeyService.loadSnapshot();

    expect(homeyService.getSnapshot()).toMatchObject({
      connected: true,
      unreachable: false,
      error: null,
    });
  });

  it('starts a fresh request after reconnecting while an old refresh is pending', async () => {
    const pending = Promise.withResolvers<void>();
    const oldFetch = vi.fn().mockImplementation(async () => {
      await pending.promise;
      return new Response('{}');
    });
    vi.stubGlobal('fetch', oldFetch);
    const oldLoad = homeyService.loadSnapshot();
    homeyService.setClient(null);
    homeyService.resetSnapshot();
    homeyService.setClient(homeyApiClient);
    const newFetch = vi.fn().mockImplementation(async () => new Response('{}'));
    vi.stubGlobal('fetch', newFetch);
    const newLoad = homeyService.loadSnapshot();
    expect(newFetch).toHaveBeenCalled();
    await newLoad;
    const current = homeyService.getSnapshot();
    pending.resolve();
    await oldLoad;
    expect(homeyService.getSnapshot()).toBe(current);
  });

  it('does not restore the previous account cache when reconnecting fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async (url: string) =>
            new Response(
              JSON.stringify(
                url.endsWith('/devices/device') ? { old: { id: 'old', name: 'Old lamp' } } : {}
              )
            )
        )
    );
    await homeyService.loadSnapshot();
    expect(homeyService.getSnapshot().devices.old).toBeDefined();
    teardownIntegrationSession('homey');
    homeyService.setClient(homeyApiClient);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(homeyService.loadSnapshot()).rejects.toThrow('Failed to fetch');
    expect(homeyService.getSnapshot().devices).toEqual({});
  });

  it('does not call a missing Homey OAuth session an offline hub', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: 'Homey OAuth session is required' }), {
            status: 502,
          })
      )
    );

    await expect(homeyService.loadSnapshot()).rejects.toThrow(
      'Homey request failed with status 502'
    );
    expect(homeyService.getSnapshot()).toMatchObject({ connected: false, unreachable: false });
  });
});
