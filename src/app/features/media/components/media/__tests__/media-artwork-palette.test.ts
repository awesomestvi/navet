import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveArtworkPalette } from '../media-artwork-palette';

describe('resolveArtworkPalette', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('routes cross-origin Home Assistant media proxy artwork through the same-origin proxy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not image', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    await expect(
      resolveArtworkPalette(
        'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen'
      )
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
      {
        credentials: 'same-origin',
        mode: 'cors',
      }
    );
  });

  it('fetches Home Assistant media proxy artwork through the same-origin proxy when available', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not image', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    await expect(
      resolveArtworkPalette(
        'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen',
        'http://homeassistant.local:8123'
      )
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
      {
        credentials: 'same-origin',
        mode: 'cors',
      }
    );
  });

  it('does not route signed Home Assistant artwork back through the same-origin proxy', async () => {
    const RealImage = globalThis.Image;
    class FailingImage {
      decoding = 'async';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }
    // Resolve the direct image sampling path quickly so the test only exercises URL selection.
    // @ts-expect-error test image stub
    globalThis.Image = FailingImage;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not image', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    try {
      await expect(
        resolveArtworkPalette(
          'https://ha.example.test/api/media_player_proxy/media_player.kitchen?authSig=signed-artwork-token'
        )
      ).resolves.toBeNull();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://ha.example.test/api/media_player_proxy/media_player.kitchen?authSig=signed-artwork-token',
        {
          credentials: 'same-origin',
          mode: 'cors',
        }
      );
    } finally {
      globalThis.Image = RealImage;
    }
  });
});
