import { beforeEach, describe, expect, it } from 'vitest';
import {
  resolveAddonLocalEndpointUrl,
  resolveHomeAssistantConnectionUrl,
  resolveIngressAwarePath,
} from '../home-assistant-connection-target';

describe('home-assistant-connection-target', () => {
  beforeEach(() => {
    window.__NAVET_CONFIG__ = undefined;
    document.querySelector('base')?.remove();
    window.history.replaceState(null, '', '/');
  });

  it('keeps user-entered Home Assistant URLs for non-runtime sessions', () => {
    expect(
      resolveHomeAssistantConnectionUrl({
        url: 'https://ha.example.com',
        token: 'user-token',
      })
    ).toBe('https://ha.example.com');
  });

  it('uses same-origin proxy URL for matching hosted runtime Home Assistant URLs', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://ha.example.com',
      hassToken: 'runtime-token',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(
      resolveHomeAssistantConnectionUrl({
        url: 'https://ha.example.com',
        token: 'stored-user-token',
      })
    ).toBe(`${window.location.origin}/__navet_ha_proxy__`);
  });

  it('uses same-origin proxy URL for matching hosted runtime URLs without runtime tokens', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(
      resolveHomeAssistantConnectionUrl({
        url: 'http://homeassistant:8123',
        token: 'user-entered-token',
      })
    ).toBe(`${window.location.origin}/__navet_ha_proxy__`);
  });

  it('resolves proxy paths under the Home Assistant ingress base path', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/addon-slug/`;
    document.head.append(base);

    expect(resolveIngressAwarePath('/__navet_ha_proxy__')).toBe(
      '/api/hassio_ingress/addon-slug/__navet_ha_proxy__'
    );
  });

  it('uses an ingress-aware same-origin URL for add-on-local endpoints', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
    document.head.append(base);

    expect(resolveAddonLocalEndpointUrl('/__navet_session__/default')).toBe(
      `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_session__/default`
    );
  });

  it('infers the ingress base from the current path when the base tag is missing', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/dashboard');

    expect(resolveAddonLocalEndpointUrl('/__navet_profile__/default')).toBe(
      `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_profile__/default`
    );
  });

  it('uses the ingress-aware proxy URL for matching hosted runtime sessions', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
    document.head.append(base);
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://ha.example.com',
      hassToken: 'runtime-token',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(
      resolveHomeAssistantConnectionUrl({
        url: 'https://ha.example.com',
        token: 'stored-user-token',
      })
    ).toBe(`${window.location.origin}/api/hassio_ingress/navet_dev/__navet_ha_proxy__`);
  });

  it('uses the ingress-aware proxy URL for add-on manual login sessions', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
    document.head.append(base);
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(
      resolveHomeAssistantConnectionUrl({
        url: 'http://homeassistant:8123',
        token: 'user-entered-token',
      })
    ).toBe(`${window.location.origin}/api/hassio_ingress/navet_dev/__navet_ha_proxy__`);
  });
});
