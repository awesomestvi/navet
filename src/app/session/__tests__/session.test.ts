import { beforeEach, describe, expect, it } from 'vitest';
import {
  readInitialSessionConfig,
  readRuntimeSessionConfig,
  shouldSkipSharedSessionLoad,
  writeStoredSessionConfig,
} from '../session';

describe('session config', () => {
  beforeEach(() => {
    localStorage.clear();
    window.__NAVET_CONFIG__ = undefined;
    window.history.replaceState(null, '', '/');
  });

  it('reads normalized runtime session config when Docker provides credentials', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://ha.example.com/',
      hassToken: '  token  ',
    };

    expect(readRuntimeSessionConfig()).toEqual({
      url: 'https://ha.example.com',
      token: 'token',
    });
  });

  it('prefers stored session config over runtime defaults', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://runtime.example.com',
      hassToken: 'runtime-token',
    };
    writeStoredSessionConfig('navet-test-session', {
      url: 'https://stored.example.com/',
      token: 'stored-token',
    });

    expect(readInitialSessionConfig('navet-test-session')).toEqual({
      url: 'https://stored.example.com',
      token: 'stored-token',
    });
  });

  it('prefers complete runtime config over stored config inside Home Assistant ingress', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://runtime.example.com',
      hassToken: 'runtime-token',
    };
    writeStoredSessionConfig('navet-test-session', {
      url: 'https://stored.example.com/',
      token: 'stored-token',
    });

    expect(readInitialSessionConfig('navet-test-session')).toEqual({
      url: 'https://runtime.example.com',
      token: 'runtime-token',
    });
  });

  it('uses configured add-on runtime credentials for automatic login inside Home Assistant ingress', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      hassToken: 'runtime-token',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(readInitialSessionConfig('navet-test-session')).toEqual({
      url: 'http://homeassistant:8123',
      token: 'runtime-token',
    });
  });

  it('ignores incomplete runtime config', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://ha.example.com',
    };

    expect(readRuntimeSessionConfig()).toBeNull();
  });

  it('ignores runtime tokens that contain pasted diagnostic text', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      hassToken: 'GET http://homeassistant:8123/api/ net::ERR_NAME_NOT_RESOLVED',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(readRuntimeSessionConfig()).toBeNull();
  });

  it('does not authenticate from incomplete add-on runtime config inside Home Assistant ingress', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(readInitialSessionConfig('navet-test-session')).toBeNull();
  });

  it('does not fall back to stored browser config when add-on runtime token is blank', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    writeStoredSessionConfig('navet-test-session', {
      url: 'https://stored.example.com/',
      token: 'stored-token',
    });

    expect(readInitialSessionConfig('navet-test-session')).toBeNull();
  });

  it('restores a stored add-on login when the runtime token is blank', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123/',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    writeStoredSessionConfig('navet-test-session', {
      url: 'http://homeassistant:8123',
      token: 'user-entered-token',
    });

    expect(readInitialSessionConfig('navet-test-session')).toEqual({
      url: 'http://homeassistant:8123',
      token: 'user-entered-token',
    });
  });

  it('ignores a stored add-on login with an invalid token when the runtime token is blank', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    writeStoredSessionConfig('navet-test-session', {
      url: 'http://homeassistant:8123',
      token: 'GET http://homeassistant:8123/api/ net::ERR_NAME_NOT_RESOLVED',
    });

    expect(readInitialSessionConfig('navet-test-session')).toBeNull();
  });

  it('skips shared dashboard session loading for incomplete add-on runtime config', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(shouldSkipSharedSessionLoad()).toBe(true);
  });

  it('skips shared dashboard session loading when add-on runtime token is invalid', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      hassToken: 'GET http://homeassistant:8123/api/ net::ERR_NAME_NOT_RESOLVED',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(shouldSkipSharedSessionLoad()).toBe(true);
  });

  it('allows shared dashboard session loading outside incomplete add-on runtime config', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(shouldSkipSharedSessionLoad()).toBe(false);
  });
});
