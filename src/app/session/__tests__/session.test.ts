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

  it('ignores incomplete runtime config', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://ha.example.com',
    };

    expect(readRuntimeSessionConfig()).toBeNull();
  });

  it('does not authenticate from incomplete add-on runtime config inside Home Assistant ingress', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://supervisor/core',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(readInitialSessionConfig('navet-test-session')).toBeNull();
  });

  it('does not fall back to stored browser config when add-on runtime token is blank', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://supervisor/core',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    writeStoredSessionConfig('navet-test-session', {
      url: 'https://stored.example.com/',
      token: 'stored-token',
    });

    expect(readInitialSessionConfig('navet-test-session')).toBeNull();
  });

  it('skips shared dashboard session loading for incomplete add-on runtime config', () => {
    window.history.replaceState(null, '', '/api/hassio_ingress/navet_dev/');
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://supervisor/core',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(shouldSkipSharedSessionLoad()).toBe(true);
  });

  it('allows shared dashboard session loading outside incomplete add-on runtime config', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://supervisor/core',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    expect(shouldSkipSharedSessionLoad()).toBe(false);
  });
});
