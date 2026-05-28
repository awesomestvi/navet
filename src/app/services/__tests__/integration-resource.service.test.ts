import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveArtworkMock } = vi.hoisted(() => ({
  resolveArtworkMock: vi.fn(),
}));

vi.mock('@/app/infrastructure/home-assistant/home-assistant-infrastructure', () => ({
  mediaArtworkService: {
    resolveArtwork: resolveArtworkMock,
  },
}));

describe('integration-resource.service', () => {
  beforeEach(() => {
    resolveArtworkMock.mockReset();
    resolveArtworkMock.mockResolvedValue({
      id: 'artwork',
      kind: 'url',
      cacheKey: 'artwork',
      authStrategy: 'none',
      url: 'https://example.com/artwork.jpg',
    });
  });

  it('routes artwork resolution through the provider contract', async () => {
    const { resolveResource } = await import('../integration-resource.service');

    const result = await resolveResource(
      'home_assistant:media_player.living_room',
      'media_artwork',
      {
        attrs: {
          entity_picture: '/api/media_player_proxy/media_player.living_room',
        },
        fallbackPicture: '/fallback.jpg',
      }
    );

    expect(resolveArtworkMock).toHaveBeenCalledWith(
      'media_player.living_room',
      {
        entity_picture: '/api/media_player_proxy/media_player.living_room',
      },
      '/fallback.jpg'
    );
    expect(result).toMatchObject({
      kind: 'url',
      url: 'https://example.com/artwork.jpg',
    });
  });

  it('returns unavailable resources for Homey artwork requests', async () => {
    const { resolveResource } = await import('../integration-resource.service');

    await expect(resolveResource('homey:device-1', 'media_artwork')).resolves.toMatchObject({
      id: 'homey:device-1',
      kind: 'unavailable',
    });
  });
});
