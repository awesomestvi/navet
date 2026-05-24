import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveArtworkPalette } from '../media-artwork-palette';

describe('resolveArtworkPalette', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('does not fetch cross-origin Home Assistant media proxy artwork directly', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      resolveArtworkPalette(
        'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen'
      )
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
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
});
