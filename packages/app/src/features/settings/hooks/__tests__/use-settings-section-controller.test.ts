import { describe, expect, it } from 'vitest';
import {
  resolveProviderCardStatus,
  resolveProviderDisplayBaseUrl,
} from '../use-settings-section-controller';

describe('resolveProviderDisplayBaseUrl', () => {
  it('shows the Home Assistant instance URL instead of the internal connection proxy', () => {
    expect(
      resolveProviderDisplayBaseUrl({
        haBaseUrl: 'https://home.example.com',
        hassUrl: 'http://navet.local:5200/__navet_ha_proxy__',
      })
    ).toBe('https://home.example.com');
  });

  it('falls back to the connection URL for sessions without a separate instance URL', () => {
    expect(resolveProviderDisplayBaseUrl({ hassUrl: 'https://homey.example.com' })).toBe(
      'https://homey.example.com'
    );
  });
});

describe('resolveProviderCardStatus', () => {
  const health = {
    providerId: 'homey' as const,
    connected: false,
    connecting: false,
    reconnecting: false,
    implementationStatus: 'implemented' as const,
    lastError: null,
  };
  const selectedSession = {
    providerId: 'homey' as const,
    runtime: 'standalone-oauth' as const,
    authMode: 'oauth' as const,
    haBaseUrl: 'https://homey.example.com',
    hassUrl: 'https://homey.example.com',
    selectedHomeyId: 'homey-1',
    needsHomeySelection: true,
  };

  it('shows offline when OAuth selected a hub but could not establish its session', () => {
    expect(resolveProviderCardStatus('homey', health, selectedSession)).toBe('offline');
  });

  it('does not call an unselected Homey offline', () => {
    expect(
      resolveProviderCardStatus('homey', health, {
        ...selectedSession,
        selectedHomeyId: undefined,
      })
    ).toBe('signed-in');
  });

  it('shows offline on a runtime outage and connected after recovery', () => {
    expect(
      resolveProviderCardStatus('homey', { ...health, unreachable: true }, selectedSession)
    ).toBe('offline');
    expect(
      resolveProviderCardStatus('homey', { ...health, connected: true }, selectedSession)
    ).toBe('connected');
  });
});
