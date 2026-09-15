import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService } from './homey.service';
import { homeyApiClient } from './homey-api-client.service';

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
