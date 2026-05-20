import { beforeEach, describe, expect, it } from 'vitest';
import {
  resolveHomeAssistantAbsoluteUrl,
  resolveHomeAssistantProxyUrl,
} from '../home-assistant-url';

describe('home-assistant-url', () => {
  beforeEach(() => {
    document.querySelector('base')?.remove();
    window.__NAVET_PANEL__ = false;
  });

  it('keeps safe app asset paths for absolute artwork resolution', () => {
    expect(resolveHomeAssistantAbsoluteUrl('/navet/demo/assets/album.jpg')).toBe(
      '/navet/demo/assets/album.jpg'
    );
  });

  it('keeps safe app asset paths for development artwork resolution', () => {
    expect(resolveHomeAssistantProxyUrl('/navet/demo/assets/album.jpg')).toBe(
      '/navet/demo/assets/album.jpg'
    );
  });

  it('still proxies Home Assistant media paths in development', () => {
    expect(resolveHomeAssistantProxyUrl('/api/media_player_proxy/media_player.living_room')).toBe(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room'
    );
  });

  it('proxies Home Assistant media paths under the ingress base path', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/addon-slug/`;
    document.head.append(base);

    expect(resolveHomeAssistantProxyUrl('/api/media_player_proxy/media_player.living_room')).toBe(
      '/api/hassio_ingress/addon-slug/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room'
    );
  });

  it('proxies absolute Home Assistant media URLs when they match the configured Home Assistant URL', () => {
    expect(
      resolveHomeAssistantProxyUrl(
        'https://ha.example.test/api/media_player_proxy/media_player.living_room',
        'https://ha.example.test'
      )
    ).toBe('/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room');
  });

  it('keeps Home Assistant image API paths same-origin in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(resolveHomeAssistantProxyUrl('/api/image/serve/image-id/512x512')).toBe(
      '/api/image/serve/image-id/512x512'
    );
  });

  it('strips stale Home Assistant proxy image paths in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(
      resolveHomeAssistantProxyUrl('/__navet_ha_proxy__/api/image/serve/image-id/512x512')
    ).toBe('/api/image/serve/image-id/512x512');
  });

  it('strips stale Home Assistant proxy image paths for absolute resolution in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(
      resolveHomeAssistantAbsoluteUrl('/__navet_ha_proxy__/api/image/serve/image-id/512x512')
    ).toBe('/api/image/serve/image-id/512x512');
  });

  it('keeps Home Assistant media proxy paths same-origin in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(resolveHomeAssistantProxyUrl('/api/media_player_proxy/media_player.living_room')).toBe(
      '/api/media_player_proxy/media_player.living_room'
    );
  });

  it('keeps safe app asset paths unchanged in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(resolveHomeAssistantProxyUrl('/navet/demo/assets/album.jpg')).toBe(
      '/navet/demo/assets/album.jpg'
    );
  });

  it('keeps external image URLs sanitized in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(resolveHomeAssistantProxyUrl('https://cdn.example.test/album.jpg')).toBe(
      'https://cdn.example.test/album.jpg'
    );
  });

  it('keeps absolute Home Assistant URLs same-origin in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(
      resolveHomeAssistantProxyUrl(
        'https://ha.example.test/api/image/serve/image-id/512x512?authSig=abc',
        'https://ha.example.test'
      )
    ).toBe('/api/image/serve/image-id/512x512?authSig=abc');
  });

  it('strips stale absolute Home Assistant proxy URLs in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(
      resolveHomeAssistantProxyUrl(
        `${window.location.origin}/__navet_ha_proxy__/api/image/serve/image-id/512x512`,
        window.location.origin
      )
    ).toBe('/api/image/serve/image-id/512x512');
  });

  it('strips stale configured Home Assistant proxy media URLs in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(
      resolveHomeAssistantProxyUrl(
        'https://ha.example.test/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room',
        'https://ha.example.test'
      )
    ).toBe('/api/media_player_proxy/media_player.living_room');
  });

  it('keeps relative Home Assistant URLs same-origin for absolute resolution in panel mode', () => {
    window.__NAVET_PANEL__ = true;

    expect(
      resolveHomeAssistantAbsoluteUrl(
        '/api/image/serve/image-id/512x512',
        'https://ha.example.test'
      )
    ).toBe('/api/image/serve/image-id/512x512');
  });

  it('proxies Home Assistant media paths for hosted runtime artwork resolution', () => {
    expect(
      resolveHomeAssistantProxyUrl(
        '/api/media_player_proxy/media_player.living_room',
        'https://ha.example.test'
      )
    ).toBe('/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room');
  });
});
